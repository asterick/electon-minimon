/*
ISC License

Copyright (c) 2019, Bryon Vandiver

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

import { useContext, useEffect, useState, useRef } from 'react';
import {
  Button,
  Tooltip,
  ControlGroup,
  HTMLSelect,
  Switch,
} from '@blueprintjs/core';
import { AutoSizer, List } from 'react-virtualized';

import SystemContext from '../context';
import './style.css';
import { TraceAccess } from '../../emulation/trace';

export default function Debugger() {
  const ref = useRef(null);
  const listRef = useRef(null);
  const context = useContext(SystemContext);

  const [running, setRunning] = useState(context.system.running);
  const [state, setState] = useState(context.system.state);
  const [pageNames, setPageNames] = useState(context.system.tracer.getPages());
  const [followPC, setFollowPC] = useState(true);
  const [page, setPage] = useState('bios');
  const [disassembly, setDisassembly] = useState(context.system.tracer.render(page));
  const [breakpoints, setBreakpoints] = useState(context.system.breakpoints);
  const [scrollIndex, setScrollIndex] = useState(0);

  function scrollTo(address:Number) {
    let newPage;

    if (address <= 0x0fff) newPage = 'bios';
    else if (address <= 0x1fff) newPage = 'ram';
    else newPage = `rom:${address >> 15}`;

    setPage(newPage);
    setDisassembly(context.system.tracer.render(newPage));

    let idx = 0;
    for (; idx < disassembly.length; idx++) {
      if (disassembly[idx].address > address) break ;
    }

    listRef.current.scrollToRow(Math.max(0, idx - 1));
  }

  function updateState(e: CustomEvent) {
    setState(e.detail);

    if (followPC) {
      scrollTo(context.system.physicalPC());
    }
  }
  function updateRunning(e: CustomEvent) {
    setRunning(e.detail);
  }
  function updatePages() {
    setPageNames(context.system.tracer.getPages());
  }
  function updateTrace(e: CustomEvent) {
    setDisassembly(context.system.tracer.render(page));
  }
  function updateBreakpoints(e: CustomEvent) {
    setBreakpoints([...e.detail]);
  }

  function debuggerHotKeys(e: KeyboardEvent) {
    const elems = document.querySelectorAll('[data-address]:hover');

    if (elems.length > 0) {
      const address = parseInt(elems[elems.length - 1].dataset.address);

      switch (e.key) {
        case 'b':
          context.system.toggleBreakpoint(address);
          break;
        case 'u':
          context.system.tracer.forceTrace(address, TraceAccess.NONE);
          break;
        case 'c':
          context.system.tracer.forceTrace(address, TraceAccess.INSTRUCTION);
          break;
        case 'd':
          context.system.tracer.forceTrace(address, TraceAccess.DATA);
          break;
        case 'w':
          context.system.tracer.forceTrace(
            address,
            TraceAccess.DATA | TraceAccess.WORD_LO,
          );
          break;
        case 'j':
          console.log(elems);
          scrollTo(address);
          break ;
        default:
          return;
      }

      e.preventDefault();
    }
  }

  useEffect(() => {
    if (!ref.current) {
      ref.current = {
        prevPage: page,
      };

      document.body.addEventListener('keydown', debuggerHotKeys);
      context.system.addEventListener('update:cartridgeChanged', updatePages);
      context.system.addEventListener('update:state', updateState);
      context.system.addEventListener('update:running', updateRunning);
      context.system.addEventListener('update:breakpoints', updateBreakpoints);
    } else {
      context.system.tracer.removeEventListener(
        `trace:changed[${ref.current.prevPage}]`,
        updateTrace,
      );
    }

    context.system.tracer.addEventListener(
      `trace:changed[${page}]`,
      updateTrace,
    );
    ref.current.prevPage = page;
    setDisassembly(context.system.tracer.render(page));

    return () => {
      document.body.removeEventListener('keydown', debuggerHotKeys);
      context.system.tracer.removeEventListener(
        `trace:changed[${page}]`,
        updateTrace,
      );
      context.system.removeEventListener(
        'update:cartridgeChanged',
        updatePages,
      );
      context.system.removeEventListener('update:state', updateState);
      context.system.removeEventListener('update:running', updateRunning);
      context.system.removeEventListener(
        'update:breakpoints',
        updateBreakpoints,
      );
      ref.current = null;
    };
  });

  function rowRenderer({ key, index, style }) {
    const { address, label, operation, parameters, raw } = disassembly[index];

    const padAddress = `00000${address.toString(16).toUpperCase()}`;
    const className = 'entry';

    return (
      <div
        className={className}
        data-address={address}
        key={key}
        style={style}
        onDoubleClick={() => context.system.toggleBreakpoint(address)}
      >
        <span className="address">
          {padAddress.substring(padAddress.length - 6)}
        </span>
        <span className="raw">{raw}</span>
        <span className="label">
          {label && (
            <>
              <span className="identifier">{label}</span>
              <span className="symbol">:</span>
            </>
          )}
        </span>
        <span className="operation">{operation}</span>
        <span
          className="parameters"
          dangerouslySetInnerHTML={{ __html: parameters }}
        />
      </div>
    );
  }

  let addressStyles = `
  [data-address="${context.system.physicalPC()}"] .operation:before {
    content: "\\21E2";
  }`;

  if (breakpoints.length > 0) {
    addressStyles += `${breakpoints
      .map((address) => `[data-address="${address}"] .operation:after`)
      .join(', ')}{ content: '\\2022'; }`;
  }

  return (
    <div className="debugger">
      <style dangerouslySetInnerHTML={{ __html: addressStyles }} />
      <ControlGroup className="toolbar">
        <Tooltip content={running ? 'Stop' : 'Play'} compact>
          <Button
            icon={running ? 'stop' : 'play'}
            onClick={() => {
              context.system.running = !running;
            }}
          />
        </Tooltip>
        <Tooltip content="Reset" compact>
          <Button icon="reset" onClick={() => context.system.reset()} />
        </Tooltip>
        <Tooltip content="Step" compact>
          <Button icon="arrow-right" onClick={() => context.system.step()} />
        </Tooltip>
        <Tooltip content="Step Over" compact>
          <Button
            icon="arrow-top-right"
            onClick={() => context.system.step()}
          />
        </Tooltip>
        <Tooltip content="Step Out" compact>
          <Button icon="drawer-right" onClick={() => context.system.step()} />
        </Tooltip>
        <HTMLSelect
          fill
          value={page}
          onChange={(e) => {
            setPage(e.target.value);
          }}
          options={pageNames}
        />
        <Switch
          large
          checked={followPC}
          onChange={(e) => setFollowPC(!followPC)}
          label="Follow PC"
        />
      </ControlGroup>

      <div className="disassembly">
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              rowCount={disassembly.length}
              rowHeight={20}
              rowRenderer={rowRenderer}
              width={width}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}
