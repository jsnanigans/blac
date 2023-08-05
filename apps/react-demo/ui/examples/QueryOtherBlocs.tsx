import type { FC } from "react";
import React from "react";
import { Cubit } from "blac/src";
import { useBloc } from "@blac/react/src";

class IsolatedBloc extends Cubit<{ x: number, y: number }, { start: [number, number] }> {
  static isolated = true;
  velocity = { x: Math.random() * 3 - 1.5, y: Math.random() * 3 - 1.5 };
  maxX = 300;
  maxY = 200;
  size = 10;
  others: IsolatedBloc[] = [];

  constructor() {
    super({ x: 0, y: 0 });
    this._state = ({ x: this.props.start[0], y: this.props.start[1] });
    this.startJumping();

    this.blac.findAllBlocs(IsolatedBloc).then(b => {
      this.others = b.filter(b => b !== this);
    });
  }

  startJumping = () => {
    requestAnimationFrame(this.animationStep);
  };

  animationStep = () => {
    this.move(this.state.x + this.velocity.x, this.state.y + this.velocity.y);
    requestAnimationFrame(this.animationStep);
  };

  move = (x: number, y: number) => {
    const next = { x, y };

    if (x < 0) {
      next.x = 0;
      this.velocity.x = -this.velocity.x;
    } else if (x > this.maxX) {
      next.x = this.maxX;
      this.velocity.x = -this.velocity.x;
    }

    if (y < 0) {
      next.y = 0;
      this.velocity.y = -this.velocity.y;
    } else if (y > this.maxY) {
      next.y = this.maxY;
      this.velocity.y = -this.velocity.y;
    }

    for (const other of this.others) {
      //   bounce of others
      if (other !== this) {
        const dx = other.state.x - next.x;
        const dy = other.state.y - next.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + other.size) {
          const angle = Math.atan2(dy, dx);
          const targetX = next.x + Math.cos(angle) * (this.size + other.size);
          const targetY = next.y + Math.sin(angle) * (this.size + other.size);
          const ax = (targetX - other.state.x) * 0.1;
          const ay = (targetY - other.state.y) * 0.1;
          next.x -= ax;
          next.y -= ay;
          other.emit({ x: other.state.x + ax, y: other.state.y + ay });
        }
      }

    }

    this.emit(next);
  };

}

const Jumper: FC<{ index: number }> = ({ index }) => {
  const [{ x, y }, { props }] = useBloc(IsolatedBloc, {
    props: {
      start: [index * (300 % 9), index * (200 % 9)]
    }
  });
  return <div className="jumper" style={{ "--x": x + "px", "--y": y + "px" } as any} />;
};

const QueryOtherBlocs: FC = () => {
  return <div className="jumper-box">
    {Array.from({ length: 100 }).map((_, i) => <Jumper index={i} key={i} />)}
  </div>;
};

export default QueryOtherBlocs;
