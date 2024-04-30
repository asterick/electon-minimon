import SystemContext from "../context";

import { useContext, useEffect, useState } from 'react';
import { ButtonGroup, Button } from "@blueprintjs/core";
import "./style.css";

export default function Debugger () {
  const context = useContext(SystemContext);

  const [running, setRunning] = useState(context.running);
  const [state, setState] = useState(context.state);

  useEffect(() => {
    const updateState = (e:CustomEvent) => {
      setState(e.detail);
    }

    const updateRunning = (e:CustomEvent) => {
      setRunning(e.detail);
    }

    context.addEventListener('update:state', updateState);
    context.addEventListener('update:running', updateRunning);

    return () => {
      context.removeEventListener('update:state', updateState);
      context.removeEventListener('update:running', updateRunning);
    }
  });

  return (
    <div className="toolbar">
      <ButtonGroup fill={true}>
          <Button icon={running ? "stop" : "play"} onClick={(e) => context.running = !running}>{running ? "Stop" : "Play"}</Button>
          <Button icon="reset" onClick={(e) => context.reset()}>Reset</Button>
          <Button icon="step-forward" onClick={(e) => context.step()}>Step</Button>
          <Button fill={true} disabled={true} />
        </ButtonGroup>
      </div>
  );
}
