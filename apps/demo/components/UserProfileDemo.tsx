import { useBloc } from '@blac/react';
import React from 'react';
import { UserProfileBloc } from '../blocs/UserProfileBloc';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

interface UserProfileDemoProps {
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultEmail?: string;
}

const UserProfileDemo: React.FC<UserProfileDemoProps> = (props) => {
  const [state, bloc] = useBloc(UserProfileBloc, { props });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            value={state.firstName}
            onChange={(e) => bloc.updateFirstName(e.target.value)}
            placeholder="First Name"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            value={state.lastName}
            onChange={(e) => bloc.updateLastName(e.target.value)}
            placeholder="Last Name"
            className="mt-2"
          />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={state.email}
            onChange={(e) => bloc.updateEmail(e.target.value)}
            placeholder="Email Address"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            value={state.age ?? ''}
            onChange={(e) => bloc.updateAge(parseInt(e.target.value, 10) || 0)}
            placeholder="Age"
            className="mt-2"
          />
        </div>
      </div>

      <div className="bg-lcars-gray-dark border border-lcars-gray-medium p-4 rounded-default space-y-3 mt-6">
        <h4 className="font-lcars uppercase text-lcars-peach-panel text-lg mb-3">Derived State (Getters):</h4>
        <p className="flex justify-between items-baseline"><span className="text-lcars-beige-panel">Full Name:</span> <span className="font-bold text-primary font-body normal-case text-right">{bloc.fullName}</span></p>
        <p className="flex justify-between items-baseline"><span className="text-lcars-beige-panel">Initials:</span> <span className="font-bold text-secondary font-body normal-case text-right">{bloc.initials}</span></p>
        {state.age !== undefined && (
            <p className="flex justify-between items-baseline"><span className="text-lcars-beige-panel">Age next year:</span> <span className="font-bold text-lcars-orange-bright font-body normal-case text-right">{state.age + 1}</span></p>
        )}
      </div>
    </div>
  );
};

export default UserProfileDemo; 