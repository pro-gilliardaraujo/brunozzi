import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertCircle, Save, FileText, Trash2 } from "lucide-react";
import { usePyodide } from '@/hooks/usePyodide';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { reportService } from '@/services/reportService';

interface FrenteUploadCardProps {
  title: string;
  onProcessComplete: (data: any, frente: string) => void;
  onProcessStart?: () => void;
  onProcessError?: (error: string) => void;
  onLog?: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export interface FrenteUploadCardHandle {
  process: () => void;
  hasFile: () => boolean;
}

export const FrenteUploadCard = forwardRef<FrenteUploadCardHandle, FrenteUploadCardProps>(({ title, onProcessComplete, onProcessStart, onProcessError, onLog }, ref) => {
  const handlePrint = useCallback((msg: string) => {
    console.log(`[Pyodide ${title}]:`, msg);
    if (onLog) onLog(msg, 'info');
  }, [title, onLog]);

  const { processFile, isProcessing, error, result } = usePyodide({
    onPrint: handlePrint
  });
  
  const [producao, setProducao] = useState("");
  const [tipo, setTipo] = useState("frota");
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const lastProcessedResultRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    process: () => {
      if (selectedFile) {
        if (onProcessStart) onProcessStart();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const arrayBuffer = ev.target?.result as ArrayBuffer;
          processFile(arrayBuffer, selectedFile.name);
        };
        reader.readAsArrayBuffer(selectedFile);
      }
    },
    hasFile: () => !!selectedFile
  }));

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      // Resetar status se trocar de arquivo
      setSaveStatus('idle');
    }
  }, []);

  const handleRemoveFile = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
    setSaveStatus('idle');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleTriggerUpload = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.click();
    }
  }, []);

  // Salvar no Supabase e notificar pai quando houver resultado
  useEffect(() => {
    const saveData = async () => {
      if (result && result !== lastProcessedResultRef.current) {
        lastProcessedResultRef.current = result;
        setSaveStatus('saving');
        
        try {
          // Extrair data do relatório (usar data do primeiro ponto ou hoje)
          let reportDate = new Date().toISOString().split('T')[0];
          
          if (result.coordenadas && result.coordenadas.length > 0 && result.coordenadas[0].data) {
            const rawDate = result.coordenadas[0].data;
            // Tentar normalizar formato DD/MM/YYYY para YYYY-MM-DD
            if (rawDate.includes('/')) {
              const parts = rawDate.split('/');
              if (parts.length === 3) {
                // Assumindo DD/MM/YYYY
                reportDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            } else if (rawDate.includes('-')) {
               reportDate = rawDate;
            }
          }

          // Gerar slug da frente (ex: "Frente 1" -> "frente1")
          // O backend usa "frenteX" ou "zirleno"
          let frenteSlug = title.toLowerCase().replace(/\s/g, '');
          // Pequeno ajuste para garantir formato correto se necessário
          // Mas vamos manter simples por enquanto
          
          const metadata = {
            tipo: 'colheita_diario',
            data: reportDate,
            frente: frenteSlug,
            is_teste: false
          };
          
          await reportService.saveDailyReport(metadata, result);
          // await reportService.savePanelRecords(metadata, result);
          
          setSaveStatus('saved');
          if (onLog) onLog("Relatório salvo com sucesso no banco de dados!", "success");
          onProcessComplete(result, title);
        } catch (err) {
          console.error("Erro ao salvar no Supabase:", err);
          setSaveStatus('error');
          if (onLog) onLog(`Erro ao salvar no banco: ${err}`, "error");
          // Notificar pai mesmo com erro de salvamento para permitir visualização local
          onProcessComplete(result, title);
        }
      }
    };
    
    saveData();
  }, [result, title, onProcessComplete, onLog]);

  // Monitorar erros do Pyodide
  useEffect(() => {
    if (error) {
      if (onProcessError) onProcessError(error);
      if (onLog) onLog(`Erro no processamento: ${error}`, 'error');
    }
  }, [error, onProcessError, onLog]);

  return (
    <Card className="overflow-hidden">
      <div className="bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold border border-input">
        {title}
      </div>
      <CardContent className="p-2 space-y-2">
        <div className="space-y-2">
          <RadioGroup value={tipo} onValueChange={setTipo} className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem id={`${title}-frota`} value="frota" />
              <Label htmlFor={`${title}-frota`} className="text-sm">Frota</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id={`${title}-frente`} value="frente" />
              <Label htmlFor={`${title}-frente`} className="text-sm">Frente</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Colhedoras</div>
          <Input 
            placeholder="Produção do dia (ex: 1500)" 
            value={producao}
            onChange={(e) => setProducao(e.target.value)}
          />
          
          <div className="relative">
            <input
              ref={inputRef}
              type="file"
              accept=".zip,.xlsx,.csv,.txt"
              onChange={handleFileChange}
              className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${selectedFile ? 'hidden' : ''}`}
              disabled={isProcessing}
            />
            <div className={`border-2 border-dashed rounded-md p-6 text-center text-xs ${isProcessing || saveStatus === 'saving' ? 'bg-slate-50' : 'hover:bg-slate-50'} transition-colors relative`}>
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <div className="text-primary font-medium">Processando...</div>
                </div>
              ) : saveStatus === 'saving' ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                  <div className="text-blue-600 font-medium">Salvando no Banco...</div>
                </div>
              ) : result && saveStatus === 'saved' ? (
                <div className="flex flex-col items-center text-green-600 relative z-20 gap-2">
                  <CheckCircle className="h-6 w-6" />
                  <div className="font-medium">Processado e Salvo!</div>
                  <div className="flex gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2"
                      onClick={handleTriggerUpload}
                    >
                      Substituir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleRemoveFile}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center text-blue-600 relative z-20 gap-2">
                   <FileText className="h-6 w-6" />
                   <div className="font-medium px-2 text-center" title={selectedFile.name}>{selectedFile.name}</div>
                   <div className="text-[10px] text-muted-foreground">Aguardando processamento...</div>
                   <div className="flex gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2"
                      onClick={handleTriggerUpload}
                    >
                      Trocar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleRemoveFile}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                   </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
                  <div className="text-muted-foreground">Clique ou arraste e solte para selecionar</div>
                  <div className="mt-1 text-muted-foreground">Formato: .zip, .csv</div>
                </>
              )}
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Transbordos (Placeholder for now) */}
        <div className="space-y-2 opacity-50 pointer-events-none">
          <div className="text-sm font-medium">Transbordos</div>
          <div className="border-2 border-dashed rounded-md p-6 text-center text-xs text-muted-foreground">
            <Upload className="mx-auto h-6 w-6 mb-2" />
            <div>Em breve</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FrenteUploadCard.displayName = "FrenteUploadCard";
