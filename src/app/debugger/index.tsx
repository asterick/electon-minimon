import { useContext, useEffect, useState, useRef } from 'react';
import { ButtonGroup, Button, Tooltip, ControlGroup, HTMLSelect, Switch } from '@blueprintjs/core';
import SystemContext from '../context';
import './style.css';

export default function Debugger() {
  const listeners = useRef(null);
  const context = useContext(SystemContext);

  const [running, setRunning] = useState(context.system.running);
  const [state, setState] = useState(context.system.state);

  useEffect(() => {
    if (!listeners.current) {
      listeners.current = {
        updateState: (e: CustomEvent) => {
          setState(e.detail);
        },
        updateRunning: (e: CustomEvent) => {
          setRunning(e.detail);
        }
      }

      context.system.addEventListener('update:state', listeners.updateState);
      context.system.addEventListener('update:running', listeners.updateRunning);
    }

    return () => {
      context.system.removeEventListener('update:state', listeners.updateState);
      context.system.removeEventListener('update:running', listeners.updateRunning);
      listeners.current = null;
    };
  });

  return (
    <div className="debugger">
      <ControlGroup className="toolbar">
        <Tooltip content={running ? 'Stop' : 'Play'} compact={true}>
          <Button
            icon={running ? 'stop' : 'play'}
            onClick={() => {
              context.system.running = !running;
            }} />
        </Tooltip>
        <Tooltip content="Reset" compact={true}>
          <Button icon="reset" onClick={() => context.system.reset()} />
        </Tooltip>
        <Tooltip content="Step" compact={true}>
          <Button icon="arrow-right" onClick={() => context.system.step()} />
        </Tooltip>
        <Tooltip content="Step Over" compact={true}>
          <Button icon="arrow-top-right" onClick={() => context.system.step()} />
        </Tooltip>
        <Tooltip content="Step Out" compact={true}>
          <Button icon="drawer-right" onClick={() => context.system.step()} />
        </Tooltip>
        <HTMLSelect fill={true} options={['a','b','c']} />
        <Switch large={true} label="Follow PC" />
      </ControlGroup>

      <div className="body">
        <div className="disassembly">asdf</div>
        <div className="info">
          <div className="registers">asdf</div>
          <div className="stack">asdf</div>
        </div>
      </div>
    </div>
  );
}
