import React, { useState, useRef, useEffect } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { z } from 'zod';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Sword,
  Shield,
  Heart,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Skull,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ============= Schema Definition =============

const CharacterStatsSchema = z.object({
  name: z.string().min(1, 'Name required').max(20, 'Name too long'),
  level: z.number().int('Level must be whole number').min(1).max(100),
  health: z.number().int('Health must be whole number').min(0).max(100),
  mana: z.number().int('Mana must be whole number').min(0).max(50),
  attack: z.number().int('Attack must be whole number').min(1).max(20),
  defense: z.number().int('Defense must be whole number').min(1).max(20),
  experience: z.number().int('XP must be whole number').min(0),
});

type CharacterStats = z.infer<typeof CharacterStatsSchema>;

// ============= Cubit with Schema =============

class CharacterCubit extends Cubit<CharacterStats> {
  static schema = CharacterStatsSchema;

  constructor() {
    super({
      name: 'Hero',
      level: 1,
      health: 100,
      mana: 50,
      attack: 10,
      defense: 10,
      experience: 0,
    });
  }

  takeDamage = (amount: number) => {
    this.emit({
      ...this.state,
      health: this.state.health - amount,
    });
  };

  heal = (amount: number) => {
    this.emit({
      ...this.state,
      health: this.state.health + amount,
    });
  };

  useMana = (amount: number) => {
    this.emit({
      ...this.state,
      mana: this.state.mana - amount,
    });
  };

  restoreMana = (amount: number) => {
    this.emit({
      ...this.state,
      mana: this.state.mana + amount,
    });
  };

  increaseStat = (stat: 'attack' | 'defense', amount: number) => {
    this.emit({
      ...this.state,
      [stat]: this.state[stat] + amount,
    });
  };

  gainExperience = (xp: number) => {
    const newXp = this.state.experience + xp;
    const xpForNextLevel = this.state.level * 100;

    if (newXp >= xpForNextLevel) {
      this.emit({
        ...this.state,
        level: this.state.level + 1,
        experience: newXp - xpForNextLevel,
        health: Math.min(100, this.state.health + 20),
        mana: Math.min(50, this.state.mana + 10),
      });
    } else {
      this.emit({
        ...this.state,
        experience: newXp,
      });
    }
  };

  rename = (name: string) => {
    this.emit({ ...this.state, name });
  };

  reset = () => {
    this.emit({
      name: 'Hero',
      level: 1,
      health: 100,
      mana: 50,
      attack: 10,
      defense: 10,
      experience: 0,
    });
  };

  // Validated versions for testing schema violations
  takeDamageValidated = (amount: number) => {
    this.emitValidated({
      ...this.state,
      health: this.state.health - amount,
    });
  };

  healValidated = (amount: number) => {
    this.emitValidated({
      ...this.state,
      health: this.state.health + amount,
    });
  };

  useManaValidated = (amount: number) => {
    this.emitValidated({
      ...this.state,
      mana: this.state.mana - amount,
    });
  };

  increaseStatValidated = (stat: 'attack' | 'defense', amount: number) => {
    this.emitValidated({
      ...this.state,
      [stat]: this.state[stat] + amount,
    });
  };
}

// ============= Types =============

interface FloatingNumber {
  id: string;
  value: number;
  type: 'damage' | 'heal' | 'mana' | 'xp' | 'levelup';
  x: number;
  y: number;
}

interface LogEntry {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'levelup';
  timestamp: number;
}

// ============= Floating Number Component =============

function FloatingNumber({
  number,
  onComplete,
}: {
  number: FloatingNumber;
  onComplete: () => void;
}) {
  const colors = {
    damage: 'text-red-500',
    heal: 'text-green-500',
    mana: 'text-blue-500',
    xp: 'text-yellow-500',
    levelup: 'text-purple-500',
  };

  const prefix = {
    damage: '-',
    heal: '+',
    mana: '+',
    xp: '+',
    levelup: 'LEVEL UP!',
  };

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{
        opacity: 0,
        y: -50,
        scale: number.type === 'levelup' ? 1.5 : 1.2,
      }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className={`absolute pointer-events-none font-bold text-xl ${colors[number.type]} drop-shadow-lg`}
      style={{ left: number.x, top: number.y }}
    >
      {number.type === 'levelup'
        ? prefix[number.type]
        : `${prefix[number.type]}${number.value}`}
    </motion.div>
  );
}

// ============= Stat Bar Component =============

function StatBar({
  value,
  max,
  label,
  icon: Icon,
  color,
  showDanger = false,
}: {
  value: number;
  max: number;
  label: string;
  icon: React.ElementType;
  color: string;
  showDanger?: boolean;
}) {
  const percentage = (value / max) * 100;
  const isDanger = showDanger && percentage <= 25;
  const isLow = showDanger && percentage <= 50 && percentage > 25;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <span
          className={`text-xs font-mono font-bold ${isDanger ? 'text-red-500 animate-pulse' : 'text-foreground'}`}
        >
          {value} / {max}
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden border border-border">
        <motion.div
          className={`h-full ${color} ${isDanger ? 'animate-pulse' : ''}`}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {isDanger && (
          <motion.div
            className="absolute inset-0 bg-red-500/20"
            animate={{ opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      {/* Fixed height container to prevent layout shift */}
      <div className="h-4">
        <AnimatePresence mode="wait">
          {isDanger && (
            <motion.p
              key="critical"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 font-semibold flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Critical!
            </motion.p>
          )}
          {isLow && !isDanger && (
            <motion.p
              key="low"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-orange-500 flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Low
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============= Main Component =============

export function CharacterStatsDemo() {
  const [state, cubit] = useBloc(CharacterCubit);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [combatLog, setCombatLog] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const xpForNextLevel = state.level * 100;
  const xpProgress = (state.experience / xpForNextLevel) * 100;
  const prevLevelRef = useRef(state.level);

  // Detect level up
  useEffect(() => {
    if (state.level > prevLevelRef.current) {
      // Level up happened!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB'],
        startVelocity: 45,
      });

      addFloatingNumber(0, 'levelup', 50, 20);
      addLog(`🎉 Level Up! You are now level ${state.level}!`, 'levelup');
    }
    prevLevelRef.current = state.level;
  }, [state.level]);

  const addFloatingNumber = (
    value: number,
    type: FloatingNumber['type'],
    x = 50,
    y = 50,
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloatingNumbers((prev) => [...prev, { id, value, type, x, y }]);
  };

  const addLog = (message: string, type: LogEntry['type']) => {
    const id = `${Date.now()}-${Math.random()}`;
    setCombatLog((prev) => [
      { id, message, type, timestamp: Date.now() },
      ...prev.slice(0, 4),
    ]);
  };

  const shakeScreen = () => {
    controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    });
  };

  const tryAction = (
    action: () => void,
    actionName: string,
    successMessage: string,
    options?: {
      floatingNumber?: { value: number; type: FloatingNumber['type'] };
      shake?: boolean;
    },
  ) => {
    try {
      setLastError(null);
      const prevState = { ...state };
      action();

      addLog(successMessage, 'success');

      if (options?.floatingNumber) {
        const rect = containerRef.current?.getBoundingClientRect();
        const x = rect ? rect.width / 2 + (Math.random() - 0.5) * 100 : 50;
        const y = rect ? rect.height / 3 : 50;
        addFloatingNumber(
          options.floatingNumber.value,
          options.floatingNumber.type,
          x,
          y,
        );
      }

      if (options?.shake) {
        shakeScreen();
      }
    } catch (error) {
      console.error(`${actionName} failed:`, error);
      setLastError(error as Error);
      addLog(`❌ ${actionName} failed: ${(error as Error).message}`, 'error');
      setTimeout(() => setLastError(null), 4000);

      // Extra shake on error
      controls.start({
        x: [0, -5, 5, -5, 5, 0],
        backgroundColor: [
          'transparent',
          'rgba(239, 68, 68, 0.1)',
          'transparent',
        ],
        transition: { duration: 0.4 },
      });
    }
  };

  return (
    <motion.div
      ref={containerRef}
      animate={controls}
      className="w-full space-y-5 relative"
    >
      {/* Floating Numbers */}
      <AnimatePresence>
        {floatingNumbers.map((num) => (
          <FloatingNumber
            key={num.id}
            number={num}
            onComplete={() =>
              setFloatingNumbers((prev) => prev.filter((n) => n.id !== num.id))
            }
          />
        ))}
      </AnimatePresence>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column - Character Stats */}
        <div className="space-y-5">
          {/* Character Card */}
          <div className="rounded-xl border-2 border-border bg-gradient-to-br from-card via-card to-muted/50 overflow-hidden shadow-xl">
            {/* Header with Character Avatar */}
            <div className="relative border-b-2 border-border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent backdrop-blur p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-3xl shadow-lg border-4 border-background">
                      ⚔️
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-background">
                      L{state.level}
                    </div>
                  </div>

                  {/* Character Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {state.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-brand/20 text-brand border-brand/50 font-semibold text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Level {state.level}
                    </Badge>
                  </div>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    cubit.reset();
                    setFloatingNumbers([]);
                    setLastError(null);
                    setCombatLog([]);
                  }}
                  className="text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                >
                  Reset
                </Button>
              </div>

              {/* XP Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    Experience
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {state.experience} / {xpForNextLevel} XP
                  </span>
                </div>
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden border border-border/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600"
                    initial={false}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Stats Display */}
            <div className="p-4 space-y-4">
              {/* Vital Stats */}
              <div className="space-y-3">
                <StatBar
                  value={state.health}
                  max={100}
                  label="Health Points"
                  icon={Heart}
                  color="bg-gradient-to-r from-red-500 to-red-600"
                  showDanger={true}
                />
                <StatBar
                  value={state.mana}
                  max={50}
                  label="Mana Points"
                  icon={Zap}
                  color="bg-gradient-to-r from-blue-500 to-blue-600"
                  showDanger={true}
                />
              </div>

              {/* Combat Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                  <div className="p-1.5 rounded-lg bg-orange-500/20">
                    <Sword className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Attack
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {state.attack}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="p-1.5 rounded-lg bg-blue-500/20">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Defense
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {state.defense}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Combat Log */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 min-h-[140px]">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Combat Log
            </h3>
            {combatLog.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic py-2">
                No actions yet. Try clicking a button!
              </p>
            ) : (
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {combatLog.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`text-xs px-2 py-1 rounded ${
                        log.type === 'success'
                          ? 'text-green-700 dark:text-green-400'
                          : log.type === 'error'
                            ? 'text-red-700 dark:text-red-400'
                            : log.type === 'levelup'
                              ? 'text-purple-700 dark:text-purple-400 font-bold'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {log.message}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-5">
          {/* Valid Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-bold text-foreground">Actions</h3>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              {/* Health Actions */}
              <div className="p-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Health Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      tryAction(
                        () => cubit.takeDamage(20),
                        'Take Damage',
                        '⚔️ Took 20 damage',
                        {
                          floatingNumber: { value: 20, type: 'damage' },
                          shake: true,
                        },
                      )
                    }
                    className="justify-start text-xs border-orange-300 hover:border-orange-500 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30 font-semibold"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    Take 20 Damage
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      tryAction(
                        () => cubit.heal(30),
                        'Heal',
                        '💚 Healed 30 HP',
                        { floatingNumber: { value: 30, type: 'heal' } },
                      )
                    }
                    className="justify-start text-xs border-green-300 hover:border-green-500 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30 font-semibold"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    Heal 30 HP
                  </Button>
                </div>
              </div>

              {/* Mana Actions */}
              <div className="p-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Mana Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      tryAction(
                        () => cubit.useMana(15),
                        'Use Mana',
                        '✨ Used 15 mana',
                        { floatingNumber: { value: 15, type: 'mana' } },
                      )
                    }
                    className="justify-start text-xs border-blue-300 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30 font-semibold"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Cast Spell (15)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      tryAction(
                        () => cubit.restoreMana(25),
                        'Restore Mana',
                        '💙 Restored 25 mana',
                        { floatingNumber: { value: 25, type: 'mana' } },
                      )
                    }
                    className="justify-start text-xs border-cyan-300 hover:border-cyan-500 hover:bg-cyan-50 dark:border-cyan-800 dark:hover:bg-cyan-950/30 font-semibold"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Drink Potion
                  </Button>
                </div>
              </div>

              {/* Training Actions */}
              <div className="p-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Sword className="h-3 w-3" />
                  Training
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      tryAction(
                        () => cubit.increaseStat('attack', 5),
                        'Train Attack',
                        '⚔️ Attack increased by 5',
                      )
                    }
                    className="justify-start text-xs border-purple-300 hover:border-purple-500 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/30 font-semibold"
                  >
                    <Sword className="h-3 w-3 mr-1" />
                    Train Attack
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      tryAction(
                        () => cubit.increaseStat('defense', 5),
                        'Train Defense',
                        '🛡️ Defense increased by 5',
                      )
                    }
                    className="justify-start text-xs border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/30 font-semibold"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Train Defense
                  </Button>
                </div>
              </div>

              {/* XP Action */}
              <div className="p-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Experience
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    tryAction(
                      () => cubit.gainExperience(50),
                      'Gain XP',
                      '⭐ Gained 50 XP',
                      { floatingNumber: { value: 50, type: 'xp' } },
                    )
                  }
                  className="w-full justify-start text-xs border-yellow-300 hover:border-yellow-500 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30 font-semibold"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Complete Quest (+50 XP)
                </Button>
              </div>
            </div>
          </div>

          {/* Schema Violation Tests */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-foreground">
                Test Schema Violations
              </h3>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
              These actions violate schema constraints and will be rejected:
            </p>

            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  tryAction(
                    () => cubit.takeDamageValidated(10000),
                    'Massive Damage',
                    '',
                    { shake: true },
                  )
                }
                className="justify-between text-xs border-red-400 hover:border-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 font-semibold"
              >
                <span className="flex items-center gap-1">
                  <Skull className="h-3 w-3" />
                  Fatal Blow (10,000)
                </span>
                <code className="text-xs opacity-70">health {'<'} 0</code>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  tryAction(() => cubit.healValidated(10000), 'Over Heal', '')
                }
                className="justify-between text-xs border-red-400 hover:border-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 font-semibold"
              >
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Divine Heal (10,000)
                </span>
                <code className="text-xs opacity-70">health {'>'} 1000</code>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  tryAction(
                    () => cubit.useManaValidated(10000),
                    'Mana Drain',
                    '',
                  )
                }
                className="justify-between text-xs border-red-400 hover:border-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 font-semibold"
              >
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Mana Void (10,000)
                </span>
                <code className="text-xs opacity-70">mana {'<'} 0</code>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  tryAction(
                    () => cubit.increaseStatValidated('attack', 500),
                    'God Mode',
                    '',
                  )
                }
                className="justify-between text-xs border-red-400 hover:border-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 font-semibold"
              >
                <span className="flex items-center gap-1">
                  <Sword className="h-3 w-3" />
                  God Mode (+500)
                </span>
                <code className="text-xs opacity-70">attack {'>'} 200</code>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Error Display - Fixed height to prevent layout shift */}
      <AnimatePresence mode="wait">
        {lastError && (
          <div className="min-h-[120px]">
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border-2 border-red-500 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 p-4 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900 dark:text-red-300 mb-1">
                    Schema Validation Failed!
                  </p>
                  <p className="text-xs text-red-800 dark:text-red-400 mb-2">
                    {lastError.message}
                  </p>
                  <div className="text-xs text-red-700 dark:text-red-500 bg-red-100 dark:bg-red-950/30 px-3 py-2 rounded-lg border border-red-300 dark:border-red-800">
                    <strong>Protected:</strong> State change was rejected -
                    character stats remain valid
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schema Info */}
      <div className="rounded-xl border-2 border-brand/30 bg-gradient-to-r from-brand/5 via-brand/3 to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand/20">
            <CheckCircle2 className="h-5 w-5 text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              Schema-Protected State
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All character stats are validated by a Zod schema defined as{' '}
              <code className="px-1.5 py-0.5 bg-muted rounded text-brand font-semibold">
                static schema
              </code>{' '}
              on the Cubit. Normal actions use{' '}
              <code className="px-1.5 py-0.5 bg-muted rounded font-mono text-xs">
                emit()
              </code>{' '}
              for internal transitions. The "Test Schema Violations" buttons use{' '}
              <code className="px-1.5 py-0.5 bg-muted rounded font-mono text-xs">
                emitValidated()
              </code>{' '}
              which <strong>rejects invalid state changes</strong> (negative
              health, stats exceeding limits). State is{' '}
              <strong className="text-brand">always valid</strong> and
              type-safe!
            </p>
          </div>
        </div>
      </div>
      <br />
      <br />
    </motion.div>
  );
}
