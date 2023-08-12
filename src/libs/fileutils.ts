export function createBlobFromObject(obj: any): Blob {
  const json = JSON.stringify(obj);
  return new Blob([json], { type: 'application/json' });
}

export function downloadFileAs(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}