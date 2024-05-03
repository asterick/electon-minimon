import { useContext, useEffect, useState, useRef } from 'react';
import { ButtonGroup, Button, Tooltip, ControlGroup, HTMLSelect, Switch } from '@blueprintjs/core';
import SystemContext from '../context';
import './style.css';

export default function Debugger() {
  const ref = useRef(null);
  const context = useContext(SystemContext);

  const [running, setRunning] = useState(context.system.running);
  const [state, setState] = useState(context.system.state);
  const [pageNames, setPageNames] = useState(context.system.tracer.getPages());
  const [followPC, setFollowPC] = useState(true);
  const [page, setPage] = useState('bios');
  const [disassembly, setDisassembly] = useState(context.system.tracer.render(page));

  function updateState (e: CustomEvent) {
    setState(e.detail);

    if (followPC) {
      let pc = context.system.physicalPC();
      let newPage;

      if (pc <= 0x0FFF)
        newPage = "bios";
      else if (pc <= 0x1FFF)
        newPage = "ram";
      else
        newPage = `rom:${pc >> 15}`

      if (newPage !== page) {
        setPage(newPage);
        setDisassembly(context.system.tracer.render(newPage));
      }
    }
  }
  function updateRunning (e: CustomEvent) {
    setRunning(e.detail);
  }
  function updatePages() {
    setPageNames(context.system.tracer.getPages());
  }
  function updateTrace (e: CustomEvent) {
    setDisassembly(context.system.tracer.render(page));
  }

  useEffect(() => {
    if (!ref.current) {
      ref.current = {
        prevPage: page
      };

      context.system.addEventListener('update:cartridgeChanged', updatePages);
      context.system.addEventListener('update:state', updateState);
      context.system.addEventListener('update:running', updateRunning);
    } else {
      context.system.tracer.removeEventListener(`trace:changed[${ref.current.prevPage}]`, updateTrace);
    }

    context.system.tracer.addEventListener(`trace:changed[${page}]`, updateTrace);
    ref.current.prevPage = page;

    return () => {
      context.system.tracer.removeEventListener(`trace:changed[${page}]`, updateTrace);
      context.system.removeEventListener('update:cartridgeChanged', updatePages);
      context.system.removeEventListener('update:state', updateState);
      context.system.removeEventListener('update:running', updateRunning);
      context.system.tracer.removeEventListener('trace:changed', updateTrace);
      ref.current = null;
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
        <HTMLSelect fill={true} value={page} onChange={(e) => {setPage(e.target.value)}} options={pageNames} />
        <Switch large={true} checked={followPC} onChange={(e) => setFollowPC(!followPC)} label="Follow PC" />
      </ControlGroup>

      <div className="body">
        <div className="disassembly"></div>
        <div className="info">
          <div className="registers">asdf</div>
          <div className="stack">asdf</div>
        </div>
      </div>
    </div>
  );
}
