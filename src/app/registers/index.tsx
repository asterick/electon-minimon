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
import { Icon } from '@blueprintjs/core';

import SystemContext from '../context';

import './style.css';

export default function Debugger() {
  const ref = useRef(false);
  const context = useContext(SystemContext);

  const [cpuState, setCpuState] = useState(context.system.state);

  function updateState(e: CustomEvent) {
    setCpuState({ ...e.detail.cpu });
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

  function format(v, d = 2) {
    if (typeof v !== 'number') return '???';
    const padded = `000${v.toString(16).toUpperCase()}`;
    return padded.substring(padded.length - d);
  }

  function encodeSC() {
    return format(
      (cpuState.i << 6) |
        (cpuState.u ? 0b100000 : 0) |
        (cpuState.d ? 0b010000 : 0) |
        (cpuState.n ? 0b001000 : 0) |
        (cpuState.v ? 0b000100 : 0) |
        (cpuState.c ? 0b000010 : 0) |
        (cpuState.z ? 0b000001 : 0),
    );
  }

  return (
    <div className="registers">
      <table>
        <thead>
          <tr>
            <th colSpan={5}>Registers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CB</td>
            <td>{format(cpuState.cb)}</td>
            <td>PC</td>
            <td colSpan={2}>{format(cpuState.pc, 4)}</td>
          </tr>
          <tr>
            <td>NB</td>
            <td>{format(cpuState.nb)}</td>
            <td>SP</td>
            <td colSpan={2}>{format(cpuState.sp, 4)}</td>
          </tr>
          <tr>
            <td colSpan={2} />
            <td>BA</td>
            <td>{format(cpuState.b)}</td>
            <td>{format(cpuState.a)}</td>
          </tr>
          <tr>
            <td rowSpan={2}>EP</td>
            <td rowSpan={2}>{format(cpuState.ep)}</td>
            <td>HL</td>
            <td>{format(cpuState.h)}</td>
            <td>{format(cpuState.l)}</td>
          </tr>
          <tr>
            <td>BR</td>
            <td>{format(cpuState.br)}</td>
          </tr>
          <tr>
            <td>XP</td>
            <td>{format(cpuState.xp)}</td>
            <td>IX</td>
            <td colSpan={2}>{format(cpuState.ix, 4)}</td>
          </tr>
          <tr>
            <td>YP</td>
            <td>{format(cpuState.yp)}</td>
            <td>IY</td>
            <td colSpan={2}>{format(cpuState.iy, 4)}</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th colSpan={8}>Flags</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SC</td>
            <td>I</td>
            <td>U</td>
            <td>D</td>
            <td>N</td>
            <td>V</td>
            <td>C</td>
            <td>Z</td>
          </tr>
          <tr>
            <td>{encodeSC(cpuState)}</td>
            <td>{cpuState.i}</td>
            <td>
              <Icon icon={cpuState.u ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.d ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.n ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.v ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.c ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.z ? 'selection' : 'circle'} />
            </td>
          </tr>
          <tr>
            <td colSpan={4} />
            <td>F3</td>
            <td>F2</td>
            <td>F1</td>
            <td>F0</td>
          </tr>
          <tr>
            <td colSpan={4} />
            <td>
              <Icon icon={cpuState.f3 ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.f2 ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.f1 ? 'selection' : 'circle'} />
            </td>
            <td>
              <Icon icon={cpuState.f0 ? 'selection' : 'circle'} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
