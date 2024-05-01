import SystemContext from "../context";

import { useContext, useEffect, useState } from 'react';
import { ButtonGroup, Button } from "@blueprintjs/core";
import "./style.css";

export default function Debugger () {
  const context = useContext(SystemContext);

  const [running, setRunning] = useState(context.system.running);
  const [state, setState] = useState(context.system.state);

  useEffect(() => {
    const updateState = (e:CustomEvent) => {
      setState(e.detail);
    }

    const updateRunning = (e:CustomEvent) => {
      setRunning(e.detail);
    }

    context.system.addEventListener('update:state', updateState);
    context.system.addEventListener('update:running', updateRunning);

    return () => {
      context.system.removeEventListener('update:state', updateState);
      context.system.removeEventListener('update:running', updateRunning);
    }
  });

  return <>
    <div className="toolbar">
      <ButtonGroup>
        <Button icon={running ? "stop" : "play"} onClick={(e) => context.system.running = !running}>{running ? "Stop" : "Play"}</Button>
        <Button icon="reset" onClick={(e) => context.system.reset()}>Reset</Button>
        <Button icon="step-forward" onClick={(e) => context.system.step()}>Step</Button>
      </ButtonGroup>
    </div>
    <div className="body">
      <div className="disassembly">asdf</div>
      <div className="info">
        <div className="registers">asdf</div>
        <div className="stack">asdf</div>
      </div>
    </div>
  </>;
}
