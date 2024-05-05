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
import { AutoSizer, List } from 'react-virtualized';

import SystemContext from '../context';

import './style.css';

export default function Stack() {
  const ref = useRef(false);
  const context = useContext(SystemContext);

  const [stack, setStack] = useState([]);

  function updateState(e: CustomEvent) {
    console.log(context.system.tracer.unrollStack());
    setStack(context.system.tracer.unrollStack());
  }

  useEffect(() => {
    if (!ref.current) {
      ref.current = true;

      context.system.addEventListener('update:state', updateState);
    }

    return () => {
      context.system.removeEventListener('update:state', updateState);
      ref.current = false;
    };
  });

  function rowRenderer({ key, index, style }) {
    const { address, data } = stack[index];

    return <div><span className="address">{address}</span><span className="data" dangerouslySetInnerHTML={{__html: data}}/></div>
  }

  return <div className="stack">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            rowCount={stack.length}
            rowHeight={20}
            rowRenderer={rowRenderer}
            width={width}
          />
        )}
      </AutoSizer>
    </div>;
}
