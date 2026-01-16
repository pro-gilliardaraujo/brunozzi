import React from 'react'

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => React.ReactNode)
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface TabelaRelatorioProps<T> {
  data: T[]
  columns: Column<T>[]
  title?: string
}

export function TabelaRelatorio<T>({ data, columns, title }: TabelaRelatorioProps<T>) {
  return (
    <div className="flex flex-col w-full">
      {title && (
        <div className="text-center font-bold text-sm mb-1 text-black">
          {title}
        </div>
      )}
      <div className="border border-black rounded-sm overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              {columns.map((col, idx) => (
                <th 
                  key={idx}
                  className={`p-2 font-bold text-black border-r border-black last:border-r-0 ${
                    col.align === 'center' ? 'text-center' : 
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => (
              <tr 
                key={rowIdx} 
                className="even:bg-slate-50 border-b border-gray-200 last:border-b-0"
              >
                {columns.map((col, colIdx) => (
                  <td 
                    key={colIdx}
                    className={`p-2 border-r border-gray-300 last:border-r-0 text-slate-700 ${
                      col.align === 'center' ? 'text-center' : 
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {typeof col.accessor === 'function' 
                      ? col.accessor(item) 
                      : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
               <tr>
                 <td colSpan={columns.length} className="p-4 text-center text-gray-500 italic">
                   Nenhum registro encontrado
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
