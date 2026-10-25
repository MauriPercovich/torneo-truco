# Torneo de Truco

Pantalla para TV que muestra un torneo de truco en vivo: tabla de posiciones, fixture todos contra todos, semifinales y final. Una persona carga los resultados desde la misma compu conectada a la TV.

- **Formato grupos** (por defecto 32 parejas en 8 grupos de 4): todas las tablas a la vista, estilo Mundial.
- **Clasificados**: se escribe el total y la app reparte por grupo y completa con los mejores 2°/3°.
- **Fixture** en una pestaña aparte, que también se puede abrir en otra ventana (se sincroniza sola).
- **Playoff**: llave completa izquierda/derecha hasta la final (final, semis, cuartos, octavos, 16avos…), con pase directo cuando los números no cierran.
- **Todos contra todos**: tabla + fixture como formato alternativo.
- **Equipos**: cantidad libre, pegar lista de nombres; renombrar conserva resultados.

Sin backend: todo se guarda en el `localStorage` del navegador.

## Stack

React + TypeScript + Vite · Lucide · deploy estático en Vercel.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```
