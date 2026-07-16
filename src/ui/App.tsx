import { useTasksChangedInvalidation } from "@/application/hooks";
import { BoardView } from "@/ui/views/board/BoardView";

function App() {
  // keep every task query in sync with .furrow edits from outside the GUI
  useTasksChangedInvalidation();
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center border-b px-3 py-2">
        <h1 className="text-sm font-semibold">vista</h1>
      </header>
      <div className="min-h-0 flex-1">
        <BoardView />
      </div>
    </main>
  );
}

export default App;
