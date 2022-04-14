import React from "react";
import { useBloc } from "../state";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import { Button, ButtonGroup, Typography } from "@material-ui/core";

export default function Auth() {
  const [data, auth] = useBloc<AuthBloc>(AuthBloc);
  return (
    <>
      <Typography>State: {JSON.stringify(data)}</Typography>
      <ButtonGroup>
        <Button onClick={() => auth.add(AuthEvent.authenticated)}>Login</Button>
        <Button onClick={() => auth.add(AuthEvent.unknown)}>Unknown</Button>
        <Button onClick={() => auth.add(AuthEvent.unauthenticated)}>
          logout
        </Button>
      </ButtonGroup>
    </>
  );
}
