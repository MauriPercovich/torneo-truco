# Torneo de Truco

Pantalla para TV que muestra un torneo de truco en vivo: tabla de posiciones, fixture todos contra todos, semifinales y final. Una persona carga los resultados desde la misma compu conectada a la TV.

- **Fase regular**: al cargar un partido, la tabla se recalcula y reordena sola (PG → Dif → PF).
- **Semis y final**: 1° vs 4° y 2° vs 3°, se habilitan al terminar la fase regular; banner de campeón al cargar la final.
- **Ajustes**: puntos para ganar en fase regular y en playoffs (15 / 20 / 30 / 40 o cualquiera de 1 a 99).
- **Equipos**: renombrar conserva resultados; agregar o quitar rearma el fixture.

Sin backend: todo se guarda en el `localStorage` del navegador.

## Stack

React + TypeScript + Vite · Lucide · deploy estático en Vercel.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```
