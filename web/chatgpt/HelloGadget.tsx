import { useSession } from "@gadgetinc/react";
import { useDisplayMode, useRequestDisplayMode } from "@gadgetinc/react-chatgpt-apps";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { ChevronLeft, ChevronRight, Expand } from "@openai/apps-sdk-ui/components/Icon";
import { Link, MemoryRouter, Route, Routes } from "react-router";

const HelloGadgetRouter = () => {
  const displayMode = useDisplayMode();
  return (
    <div className={`p-6 max-w-2xl mx-auto ${displayMode === "fullscreen" ? "h-screen" : ""}`}>
      <div className="w-full flex">
        <FullscreenButton />
      </div>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<HelloGadget />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </MemoryRouter>
    </div>
  );
};

function FullscreenButton() {
  const requestDisplayMode = useRequestDisplayMode();
  const displayMode = useDisplayMode();

  if (displayMode === "fullscreen" || !requestDisplayMode) {
    return null;
  }

  return (
    <Button
      color="secondary"
      variant="soft"
      aria-label="Enter fullscreen"
      className="rounded-full size-10 ml-auto"
      onClick={() => requestDisplayMode("fullscreen")}
    >
      <Expand />
    </Button>
  );
}

const editUiUrl = `${process.env.GADGET_APP_URL}edit/files/web/chatgpt/HelloGadget.tsx`;
const editApiUrl = `${process.env.GADGET_APP_URL}edit/files/api/mcp.ts`;

function HelloGadget() {
  return (
    <div>
      <div className="text-center flex flex-col justify-center min-h-[200px]">
        <h1 className="text-xl font-semibold tracking-tight mb-4">Get started building your ChatGPT app</h1>

        <Link to={editUiUrl} target="_blank" rel="noopener noreferrer">
          <Button color="primary">Edit how this widget looks</Button>
        </Link>
      </div>

      <div className="flex gap-2 mt-4">
        <Link to={editApiUrl} target="_blank" rel="noopener noreferrer">
          <Button color="primary" variant="outline">
            <img src="https://assets.gadget.dev/assets/icon.svg" className="size-4" />
            Change this app's tool calls
          </Button>
        </Link>

        <Link to="/about" className="ml-auto">
          <Button color="primary" variant="ghost">
            About
            <ChevronRight />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function About() {
  return (
    <div>
      <div className="flex flex-col gap-3 px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">About this template</h1>

        <p>
          Start fast with a ready-to-use ChatGPT app. This connection includes embedded iframes, auth, routing,
          fullscreen and more out of the box — everything you need to launch and iterate quickly.
        </p>
      </div>

      <Link to="/">
        <Button color="primary" variant="ghost">
          <ChevronLeft />
          Home
        </Button>
      </Link>
    </div>
  );
}

export default HelloGadgetRouter;