import type { FC } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import { Blac, Cubit } from 'blac/src';
import { useBloc } from '@blac/react/src';

class IsolatedBloc extends Cubit<
  { x: number; y: number; color: string },
  { start: [number, number]; color: string; weight: number }
> {
  static isolated = true;
  velocity = { x: Math.random() * 3 - 1.5, y: Math.random() * 3 - 1.5 };
  weight = 1;
  maxX = 600;
  maxY = 400;
  size = 10;
  others: IsolatedBloc[] = [];

  constructor() {
    super({ x: 0, y: 0, color: 'black' });
    this._state = {
      x: this.props.start[0],
      y: this.props.start[1],
      color: this.props.color,
    };
    this.weight += this.props.weight;

    this.blac.getAllBlocs(IsolatedBloc).then((b) => {
      this.others = b.filter((b) => b !== this);
    });

    this.updateRange();
  }

  frame = () => {
    this.move(this.state.x + this.velocity.x, this.state.y + this.velocity.y);
  };

  othersInVisualRangCache: IsolatedBloc[] = [];
  get othersInVisualRang(): IsolatedBloc[] {
    return this.othersInVisualRangCache;
  }

  othersInProtectedRangCache: IsolatedBloc[] = [];
  get othersInProtectedRang(): IsolatedBloc[] {
    return this.othersInProtectedRangCache;
  }

  protectedRange = 6;
  viusalRange = 20;
  updateRange = () => {
    this.othersInVisualRangCache = [];
    this.othersInProtectedRangCache = [];

    for (const other of this.others) {
      const dx = other.state.x - this.state.x;
      const dy = other.state.y - this.state.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.viusalRange) {
        this.othersInVisualRangCache.push(other);
      }

      if (distance < this.protectedRange) {
        this.othersInProtectedRang.push(other);
      }
    }

    requestAnimationFrame(() => requestAnimationFrame(this.updateRange));
  };

  biasval = 0;
  move = (x: number, y: number) => {
    const boid = {
      x,
      y,
      vx: this.velocity.x,
      vy: this.velocity.y,
      biasval: this.biasval,
    };
    // boids simulation
    const maxSpeed = 2.5;
    const minSpeed = 1;
    const avoidFactor = 0.02;
    const turnFactor = 0.1;
    const matchingFactor = 0.08;
    const centeringFactor = 0.0005;
    const othersInVisualRang = this.othersInVisualRang;
    const othersInProtectedRang = this.othersInProtectedRang;

    // separation
    let close_dx = 0;
    let close_dy = 0;

    for (const other of othersInProtectedRang) {
      close_dx += boid.x - other.state.x;
      close_dy += boid.y - other.state.y;
    }

    boid.vx += close_dx * avoidFactor;
    boid.vy += close_dy * avoidFactor;

    // alignment
    let xvel_avg = 0;
    let yvel_avg = 0;

    // cohesion
    let xpos_avg = 0;
    let ypos_avg = 0;
    for (const neigh of othersInVisualRang) {
      // alignment
      xvel_avg += neigh.velocity.x;
      yvel_avg += neigh.velocity.y;
      // cohesion
      xpos_avg += neigh.state.x;
      ypos_avg += neigh.state.y;
    }

    if (othersInVisualRang.length > 0) {
      // alignment
      xvel_avg = xvel_avg / othersInVisualRang.length;
      yvel_avg = yvel_avg / othersInVisualRang.length;

      boid.vx += (xvel_avg - boid.vx) * matchingFactor;
      boid.vy += (yvel_avg - boid.vy) * matchingFactor;

      // cohesion
      xpos_avg = xpos_avg / othersInVisualRang.length;
      ypos_avg = ypos_avg / othersInVisualRang.length;

      boid.vx += (xpos_avg - boid.x) * centeringFactor;
      boid.vy += (ypos_avg - boid.y) * centeringFactor;
    }

    // screen edges, turn-around at an organic looking radius
    const edge = 60;
    const lmargin = 0 + edge;
    const rmargin = this.maxX - edge;
    const tmargin = 0 + edge;
    const bmargin = this.maxY - edge;

    if (boid.x < lmargin) boid.vx = boid.vx + turnFactor;
    if (boid.x > rmargin) boid.vx = boid.vx - turnFactor;
    if (boid.y > bmargin) boid.vy = boid.vy - turnFactor;
    if (boid.y < tmargin) boid.vy = boid.vy + turnFactor;

    // limit speed, min-max
    const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
    if (speed > maxSpeed) {
      boid.vx = (boid.vx / speed) * maxSpeed;
      boid.vy = (boid.vy / speed) * maxSpeed;
    } else if (speed < minSpeed) {
      boid.vx = (boid.vx / speed) * minSpeed;
      boid.vy = (boid.vy / speed) * minSpeed;
    }

    boid.x = boid.x + boid.vx;
    boid.y = boid.y + boid.vy;

    // update
    this.velocity = {
      x: boid.vx,
      y: boid.vy,
    };
    this.biasval = boid.biasval;
    this.patch({ x: boid.x, y: boid.y });
  };
}

const Jumper: FC<{ index: number }> = ({ index }) => {
  const perRow = 10;
  const margin = 2;
  const size = 15;
  const [{ x, y, color }] = useBloc(IsolatedBloc, {
    props: {
      start: [
        (index % perRow) * (size + margin),
        Math.floor(index / perRow) * (size + margin),
      ],
      color: `hsl(${(index * 10) % 200}, 100%, 50%)`,
      weight: Math.random(),
    },
  });
  return (
    <div
      className="jumper sm"
      style={{ '--x': x + 'px', '--y': y + 'px', '--bg': color } as any}
    />
  );
};

const QueryOtherBlocs: FC = () => {
  const animate = useCallback((blocks: IsolatedBloc[]) => {
    for (const block of blocks) {
      block.frame();
    }

    if (blocks.length === 0) {
      return;
    }

    requestAnimationFrame(() => animate(blocks));
  }, []);

  useEffect(() => {
    Blac.getAllBlocs(IsolatedBloc).then((blocks) => {
      animate(blocks);
    });
  }, []);

  return (
    <div className="jumper-box">
      {Array.from({ length: 200 }).map((_, i) => (
        <Jumper index={i} key={i} />
      ))}
    </div>
  );
};

export default QueryOtherBlocs;
