/** Selecciona todo el contenido para que lo que se tipee reemplace el valor. */
export const selectAll = (e: { currentTarget: HTMLInputElement }) => {
  const el = e.currentTarget;
  setTimeout(() => el.select(), 0);
};
