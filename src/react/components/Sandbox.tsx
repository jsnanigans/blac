import Typography from "@material-ui/core/Typography";
import React, { FC, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { BlocBuilder, BlocProvider, useBloc, withBlocProvider } from "../state";
import Buttons from "./Buttonts";
import CounterCubit, { CounterCubitTimer, CounterCubitTimerLocal } from "../bloc/CounterCubit";
import { Box, Button, Card, CardContent } from "@material-ui/core";
import TestLocalCubit from "../bloc/TestLocalCubit";
import Divider from "@material-ui/core/Divider";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import Auth from "./Auth";

const useStyles = makeStyles((theme) => ({
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar
}));

const TestLocalBloc = () => {
  const [s, q] = useBloc(TestLocalCubit);
  return <Button onClick={() => q.emit(`${Math.random()}`)}>{s}</Button>;
};

const TestLocalHookCreate = () => {
  const [count] = useBloc(CounterCubitTimerLocal, {
    create: () => new CounterCubitTimerLocal(300)
  })
  return <div>Local: {count}</div>
}

interface CProps {text: string}
const NotConnected:FC<CProps> = ({text}) => {
  const [count] = useBloc(CounterCubitTimerLocal)
  return <div>{text}: {count}</div>
}

const Connected = withBlocProvider<CProps>(new CounterCubitTimerLocal(2000))(NotConnected)

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
  const [show, setShow] = useState(false);
  const classes = useStyles();
  return (
    <>
      <Box height={100} />
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

      <Box m={2} />
      <Typography variant="h3">Local Bloc Hook</Typography>
      <Card>
        <CardContent>
          <TestLocalHookCreate />
        </CardContent>
      </Card>

      <Box m={2} />
      <Typography variant="h3">Local Bloc HOC</Typography>
      <Card>
        <CardContent>
          <Connected text="HOC with props" />
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
              {show && <TestLocalBloc />}
            </BlocProvider>
            <Button onClick={() => setShow(!show)}>Toggle Show</Button>
          </BlocProvider>
        </CardContent>
      </Card>
    </>
  );
}
