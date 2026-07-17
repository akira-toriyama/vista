import { BoardView } from "@/ui/views/board/BoardView/BoardView";
import { ViewBoundary } from "@/ui/views/ViewBoundary";
import { useApp } from "./useApp";

/** The app shell: header plus the board behind its error/loading boundary. */
export function AppComponent() {
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center border-b px-3 py-2">
        <h1 className="text-sm font-semibold">vista</h1>
      </header>
      <div className="min-h-0 flex-1">
        <ViewBoundary>
          <BoardView />
        </ViewBoundary>
      </div>
    </main>
  );
}

/* c8 ignore start -- composition line: presenter × hook, covered by App.test */
function App() {
  return <AppComponent {...useApp()} />;
}
/* c8 ignore stop */

export default App;
