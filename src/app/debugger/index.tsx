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
import { Button, Tooltip, ControlGroup, HTMLSelect, Switch } from '@blueprintjs/core';
import { AutoSizer, List } from 'react-virtualized';

import SystemContext from '../context';
import './style.css';

/*
 * document.querySelectorAll( "[data-address]:hover" )
 */

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

  function rowRenderer({key, index, style}) {
    const { address, label, operation, parameters, raw } = disassembly[index];

    let padAddress = "00000"+address.toString(16).toUpperCase();

    return (
      <div className="entry" data-address={address} key={key} style={style}>
        <span className="address">{padAddress.substring(padAddress.length - 6)}</span>
        <span className="raw">{raw}</span>
        <span className="label">
          {label && <><span className="identifier">{label}</span><span className="symbol">:</span></>}
        </span>
        <span className="operation">{operation}</span>
        <span className="parameters" dangerouslySetInnerHTML={{__html: parameters}} />
        </div>
    );
  }

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

      <div className="disassembly">
        <AutoSizer>
          {({height, width}) => (
            <List
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
