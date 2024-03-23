import type { FC } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Blac, Cubit } from 'blac';
import { useBloc } from '@blac/react';
import { Canvas, useFrame } from '@react-three/fiber';

class IsolatedBloc extends Cubit<
  { x: number; y: number },
  { start: [number, number] }
> {
  static isolated = true;
  velocity = { x: Math.random() * 3 - 1.5, y: Math.random() * 3 - 1.5 };
  minX = -300;
  minY = -200;
  maxX = 300;
  maxY = 200;
  size = 10;
  others: IsolatedBloc[] = [];

  constructor() {
    super({ x: 0, y: 0 });
    this._state = {
      x: this.props.start[0],
      y: this.props.start[1],
    };

    const b = this.blac.getAllBlocs(IsolatedBloc);
    this.others = b.filter((b) => b !== this);

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
  viusalRange = 30;
  updateRange = () => {
    this.othersInVisualRangCache = [];
    this.othersInProtectedRangCache = [];
    const maxInSignt = 20;

    for (const other of this.others) {
      const dx = other.state.x - this.state.x;
      const dy = other.state.y - this.state.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (
        distance < this.viusalRange &&
        this.othersInVisualRangCache.length < maxInSignt
      ) {
        this.othersInVisualRangCache.push(other);
      }

      if (
        distance < this.protectedRange &&
        this.othersInProtectedRangCache.length < maxInSignt
      ) {
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
    const avoidFactor = 0.01;
    const turnFactor = 0.05;
    const matchingFactor = 0.04;
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
    const lmargin = this.minX + edge;
    const rmargin = this.maxX - edge;
    const tmargin = this.minY + edge;
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
  const [{ x, y }] = useBloc(IsolatedBloc, {
    props: {
      start: [0, 0],
    },
  });

  return (
    <mesh position={[x, y, -280]}>
      <planeGeometry args={[3, 3]} />
      <meshStandardMaterial color={'black'} />
    </mesh>
  );
};

const Ani: FC = () => {
  const [all, setAll] = useState<IsolatedBloc[]>([]);

  useEffect(() => {
    let mounted = true;
    const find = () => {
      if (!mounted) {
        return;
      }

      const found = Blac.getAllBlocs(IsolatedBloc);
      setAll(found);

      setTimeout(find, found.length > 0 ? 1000 : 100);
    };

    find();

    return () => {
      mounted = false;

      for (const b of all) {
        b.dispose();
      }
    };
  }, []);

  useFrame(() => {
    for (const b of all) {
      b.frame();
    }
  });

  return null;
};

const QueryOtherBlocs: FC = () => {
  return (
    <>
      <Canvas className="jumper-box">
        <Ani />
        <ambientLight intensity={Math.PI} />
        {Array.from({ length: 800 }).map((_, i) => (
          <Jumper index={i} key={i} />
        ))}
      </Canvas>
    </>
  );
};

export default QueryOtherBlocs;
