import { useBloc } from '@blac/react';
import { FormCubit } from './FormCubit';
import { Input, Textarea, RenderCounter } from '../../shared/components';

export function FormFields({ instanceId }: { instanceId: string }) {
  const [state, bloc] = useBloc(FormCubit, { instanceId });

  const fieldError = (field: 'name' | 'email' | 'password' | 'confirmPassword' | 'bio') => {
    const s = state[field];
    if (!s.touched) return undefined;
    return bloc.errors[field];
  };

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="FormFields" />
      <div className="form-grid">
        <Input
          label="Name"
          value={state.name.value}
          onChange={(e) => bloc.setField('name', e.target.value)}
          onBlur={() => bloc.touchField('name')}
          error={fieldError('name')}
          placeholder="Your name"
        />
        <Input
          label="Email"
          type="email"
          value={state.email.value}
          onChange={(e) => bloc.setField('email', e.target.value)}
          onBlur={() => bloc.touchField('email')}
          error={fieldError('email')}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={state.password.value}
          onChange={(e) => bloc.setField('password', e.target.value)}
          onBlur={() => bloc.touchField('password')}
          error={fieldError('password')}
          placeholder="At least 8 characters"
        />
        <Input
          label="Confirm Password"
          type="password"
          value={state.confirmPassword.value}
          onChange={(e) => bloc.setField('confirmPassword', e.target.value)}
          onBlur={() => bloc.touchField('confirmPassword')}
          error={fieldError('confirmPassword')}
          placeholder="Repeat password"
        />
        <Textarea
          label="Bio (optional)"
          value={state.bio.value}
          onChange={(e) => bloc.setField('bio', e.target.value)}
          onBlur={() => bloc.touchField('bio')}
          placeholder="Tell us about yourself"
          rows={3}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={state.agreeToTerms}
            onChange={bloc.toggleTerms}
            style={{ width: 'auto' }}
          />
          I agree to the terms and conditions
        </label>
      </div>
    </div>
  );
}
