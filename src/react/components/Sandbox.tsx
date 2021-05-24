import Typography from "@material-ui/core/Typography";
import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { BlocBuilder, BlocProvider, useBloc } from "../state";
import Buttons from "./Buttonts";
import CounterCubit, { CounterCubitTimer } from "../bloc/CounterCubit";
import Auth from "./Auth";
import { Box, Button, Card, CardContent } from "@material-ui/core";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import TestLocalCubit from "../bloc/TestLocalCubit";
import Divider from "@material-ui/core/Divider";

const useStyles = makeStyles((theme) => ({
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar
}));

const TestLocalBloc = () => {
  const [s, q] = useBloc(TestLocalCubit);
  return <Button onClick={() => q.emit(`${Math.random()}`)}>{s}</Button>;
};

const Killer = () => {
  const [l, sl] = useState(false);
  const [s, q] = useBloc(TestLocalCubit);
  return <div>
    <Buttons />
    {l && <div>
      {s}
      <hr />
      <BlocProvider<CounterCubit>
        bloc={() => new CounterCubit()}
      >
        <Typography variant="h4">Local Provider #1</Typography>
        <BlocBuilder<CounterCubit>
          blocClass={CounterCubit}
          builder={([value, { increment }]) => (
            <div>
              <Button onClick={() => increment()}>{value}</Button>
              <Buttons />
            </div>
          )}
        />
      </BlocProvider>
    </div>};
    <Divider />
    <Button onClick={() => q.emit(`${Math.random()}`)}>RND</Button>
    <Button onClick={() => sl(!l)}>Toggle</Button>
  </div>
}

export default function Sandbox() {
  const classes = useStyles();
  return (
    <>
      <div className={classes.toolbar} />

      <Typography variant="h3">Bloc</Typography>
      <Auth />

      <Box m={2} />

      <Typography variant="h3">BlocBuilder</Typography>
      <Card>
        <CardContent>
          <BlocBuilder<CounterCubit>
            blocClass={CounterCubit}
            builder={([value, { increment }]) => (
              <div>
                <Button onClick={() => increment()}>{value}</Button>
              </div>
            )}
          />

          <Buttons />

          <Box m={2} />

          <BlocBuilder<AuthBloc>
            blocClass={AuthBloc}
            builder={([value, { add }]) => (
              <div>
                <Button onClick={() => add(AuthEvent.authenticated)}>
                  Auth Bloc State: <b>{value.toString()}</b>
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Box m={2} />
      <Typography variant="h3">Breaking</Typography>
      <Card>
        <CardContent>
          <BlocProvider
            bloc={() => new TestLocalCubit()}
          >
            <Killer />
          </BlocProvider>
        </CardContent>
      </Card>

      <Typography variant="h3">Local Providers</Typography>
      <Card>
        <CardContent>
          <BlocProvider<CounterCubitTimer>
            bloc={() => new CounterCubitTimer()}
          >
            <Typography variant="h4">Local Counter Timer</Typography>
            <BlocBuilder<CounterCubitTimer>
              blocClass={CounterCubitTimer}
              builder={([value]) => (
                <div>
                  <Button>{value}</Button>
                </div>
              )}
            />
          </BlocProvider>
          <BlocProvider<CounterCubitTimer>
            bloc={() => new CounterCubitTimer(500)}
          >
            <Typography variant="h4">Local Counter Timer 2</Typography>
            <BlocBuilder<CounterCubitTimer>
              blocClass={CounterCubitTimer}
              builder={([value]) => (
                <div>
                  <Button>{value}</Button>
                </div>
              )}
            />
          </BlocProvider>

          <BlocProvider<CounterCubit>
            bloc={() => new CounterCubit()}
          >
            <Typography variant="h4">Local Provider #1</Typography>
            <BlocBuilder<CounterCubit>
              blocClass={CounterCubit}
              builder={([value, { increment }]) => (
                <div>
                  <Button onClick={() => increment()}>{value}</Button>
                  <Buttons />
                </div>
              )}
            />
          </BlocProvider>

          <BlocProvider<CounterCubit>
            bloc={() => new CounterCubit()}
          >
            <Typography variant="h4">Local Provider #2</Typography>
            <BlocBuilder<CounterCubit>
              blocClass={CounterCubit}
              builder={([value, { increment }]) => (
                <div>
                  <Button onClick={() => increment()}>{value}</Button>
                  <Buttons />
                </div>
              )}
            />
          </BlocProvider>

          <BlocProvider<CounterCubit>
            bloc={new CounterCubit()}
          >
            <BlocProvider<TestLocalCubit>
            bloc={new TestLocalCubit()}
          >
              <TestLocalBloc />
            </BlocProvider>
          </BlocProvider>
        </CardContent>
      </Card>
    </>
  );
}
