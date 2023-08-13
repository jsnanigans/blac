import type { FC } from "react";
import React, { useCallback, useEffect, useRef } from "react";
import { Blac, Cubit } from "blac/src";
import { useBloc } from "@blac/react/src";

class IsolatedBloc extends Cubit<{ x: number, y: number }, { speedX: number, speedY: number }> {
  static isolated = true;
  velocity = { x: 0, y: 0 };
  maxX = 300;
  maxY = 200;

  constructor() {
    super({ x: 150, y: 100 });
    this.startJumping();
  }

  startJumping = () => {
    this.velocity = {
      x: this.props.speedX,
      y: this.props.speedY
    };
  };

  frame = () => {
    this.move(this.state.x + this.velocity.x, this.state.y + this.velocity.y);
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

    this.emit(next);
  };

}

const Jumper: FC = () => {
  const [{ x, y }, { props }] = useBloc(IsolatedBloc, {
    props: {
      speedX: Math.random() * 5 - 2.5,
      speedY: Math.random() * 5 - 2.5
    }
  });
  return <div className="jumper" style={{ "--x": x + "px", "--y": y + "px" } as any} />;
};

const NoSharedState: FC = () => {
  const active = useRef(true);
  const animate = useCallback((blocks: IsolatedBloc[]) => {
    for (const block of blocks) {
      block.frame();
    }

    if (!active.current) return;
    requestAnimationFrame(() => animate(blocks));
  }, []);

  useEffect(() => {
    Blac.findAllBlocs(IsolatedBloc).then(blocks => {
      animate(blocks);
    });

    return () => {
      active.current = false;
    };
  }, []);

  return <div className="jumper-box">
    {Array.from({ length: 100 }).map((_, i) => <Jumper key={i} />)}
  </div>;
};

export default NoSharedState;
