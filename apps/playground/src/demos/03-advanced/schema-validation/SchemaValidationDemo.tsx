import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { z } from 'zod';
import { Cubit } from '@blac/core';
import { BlocValidationError } from '@blac/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';

// Define schema with Zod
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  age: z.number().int('Age must be an integer').min(0, 'Age must be positive').max(150, 'Age too high'),
  email: z.string().email('Invalid email format'),
  score: z.number().min(0, 'Score must be at least 0').max(100, 'Score must be at most 100'),
});

type User = z.infer<typeof UserSchema>;

// Cubit with schema validation
class UserCubit extends Cubit<User> {
  static schema = UserSchema;

  constructor() {
    super({
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
      score: 85,
    });
  }

  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  updateAge = (age: number) => {
    this.emit({ ...this.state, age });
  };

  updateEmail = (email: string) => {
    this.emit({ ...this.state, email });
  };

  updateScore = (score: number) => {
    this.emit({ ...this.state, score });
  };

  reset = () => {
    this.emit({
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
      score: 85,
    });
  };
}

export function SchemaValidationDemo() {
  const [state, cubit] = useBloc(UserCubit);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<any>(null);

  // Test values (some valid, some invalid)
  const testCases = [
    { label: 'Valid Age (25)', field: 'age', value: 25, isValid: true },
    { label: 'Invalid Age (-5)', field: 'age', value: -5, isValid: false },
    { label: 'Invalid Age (3.14)', field: 'age', value: 3.14, isValid: false },
    { label: 'Invalid Age (200)', field: 'age', value: 200, isValid: false },
    { label: 'Valid Email', field: 'email', value: 'bob@example.com', isValid: true },
    { label: 'Invalid Email', field: 'email', value: 'not-an-email', isValid: false },
    { label: 'Valid Score (95)', field: 'score', value: 95, isValid: true },
    { label: 'Invalid Score (150)', field: 'score', value: 150, isValid: false },
  ];

  const handleTestCase = (field: string, value: any) => {
    setLastAttempt({ field, value });
    setValidationError(null);

    try {
      switch (field) {
        case 'age':
          cubit.updateAge(value);
          break;
        case 'email':
          cubit.updateEmail(value);
          break;
        case 'score':
          cubit.updateScore(value);
          break;
      }
    } catch (error) {
      if (error instanceof BlocValidationError) {
        setValidationError(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Current State */}
      <Card>
        <CardHeader>
          <CardTitle>Current State (Always Valid)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <span className="ml-2 text-sm font-mono">{state.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Age:</span>
              <span className="ml-2 text-sm font-mono">{state.age}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Email:</span>
              <span className="ml-2 text-sm font-mono">{state.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Score:</span>
              <span className="ml-2 text-sm font-mono">{state.score}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
              ✓ State is always valid
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
              Zod Schema
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Validation Error Display */}
      {validationError && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4">
            <div className="text-sm text-red-800 dark:text-red-300">
              <strong>Validation Failed:</strong> {validationError}
              {lastAttempt && (
                <div className="mt-2 text-xs opacity-90 font-mono">
                  Attempted: {lastAttempt.field} = {JSON.stringify(lastAttempt.value)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Test Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Try These Test Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {testCases.map((testCase, idx) => (
              <Button
                key={idx}
                variant={testCase.isValid ? 'outline' : 'outline'}
                size="sm"
                onClick={() => handleTestCase(testCase.field, testCase.value)}
                className={`justify-start text-sm ${!testCase.isValid ? 'border-red-500 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30' : ''}`}
              >
                {testCase.isValid ? '✓' : '✗'} {testCase.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Helper Methods Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Schema Helper Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div className="text-sm">
              <code className="bg-muted px-2 py-1 rounded text-xs font-mono">cubit.isValid()</code>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={cubit.isValid({ ...state, age: 25 }) ? 'default' : 'outline'} className={cubit.isValid({ ...state, age: 25 }) ? 'bg-green-600' : 'border-red-500 text-red-700 dark:text-red-400'}>
                  age: 25 = {cubit.isValid({ ...state, age: 25 }) ? 'valid' : 'invalid'}
                </Badge>
                <Badge variant={cubit.isValid({ ...state, age: -5 }) ? 'default' : 'outline'} className={cubit.isValid({ ...state, age: -5 }) ? 'bg-green-600' : 'border-red-500 text-red-700 dark:text-red-400'}>
                  age: -5 = {cubit.isValid({ ...state, age: -5 }) ? 'valid' : 'invalid'}
                </Badge>
                <Badge variant={cubit.isValid({ ...state, age: 200 }) ? 'default' : 'outline'} className={cubit.isValid({ ...state, age: 200 }) ? 'bg-green-600' : 'border-red-500 text-red-700 dark:text-red-400'}>
                  age: 200 = {cubit.isValid({ ...state, age: 200 }) ? 'valid' : 'invalid'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => cubit.reset()}>
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
              <div>
                <strong>Runtime Validation:</strong> All state changes are validated before updating
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
              <div>
                <strong>State Integrity:</strong> Invalid changes throw errors and state remains unchanged
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
              <div>
                <strong>Rich Error Messages:</strong> Zod provides detailed validation error messages
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
              <div>
                <strong>Standard Schema:</strong> Works with Zod, Valibot, ArkType, and more
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
              <div>
                <strong>Helper Methods:</strong> isValid(), validate(), parse(), safeParse()
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
