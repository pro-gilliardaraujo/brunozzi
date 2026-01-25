export function useToast() {
  return {
    toast: (options: { title?: string; description?: string }) => {
      if (options.title) {
        console.log("[toast]", options.title, options.description ?? "")
      }
    }
  }
}

