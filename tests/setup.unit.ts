import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest runs without injected globals, so RTL cannot self-register its
// auto-cleanup — without this, rendered DOM leaks across tests in a file
afterEach(cleanup);
