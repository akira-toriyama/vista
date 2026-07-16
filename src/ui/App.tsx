import { useTasksChangedInvalidation } from "@/application/hooks";
import { Button } from "@/ui/components/ui/button";

function App() {
  // keep every task query in sync with .furrow edits from outside the GUI
  useTasksChangedInvalidation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">vista</h1>
      <Button variant="outline">placeholder</Button>
    </main>
  );
}

export default App;
