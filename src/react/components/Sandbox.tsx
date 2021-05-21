import Typography from "@material-ui/core/Typography";
import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { BlocBuilder, BlocProvider, useBloc } from "../state";
import Buttons from "./Buttonts";
import CounterCubit from "../bloc/CounterCubit";
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
  console.log(q);
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
        bloc={() => new CounterCubit("local_1")}
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
      <Typography paragraph>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Rhoncus dolor purus
        non enim praesent elementum facilisis leo vel. Risus at ultrices mi
        tempus imperdiet. Semper risus in hendrerit gravida rutrum quisque non
        tellus. Convallis convallis tellus id interdum velit laoreet id donec
        ultrices. Odio morbi quis commodo odio aenean sed adipiscing. Amet nisl
        suscipit adipiscing bibendum est ultricies integer quis. Cursus euismod
        quis viverra nibh cras. Metus vulputate eu scelerisque felis imperdiet
        proin fermentum leo. Mauris commodo quis imperdiet massa tincidunt. Cras
        tincidunt lobortis feugiat vivamus at augue. At augue eget arcu dictum
        varius duis at consectetur lorem. Velit sed ullamcorper morbi tincidunt.
        Lorem donec massa sapien faucibus et molestie ac.
      </Typography>
      <Typography paragraph>
        Consequat mauris nunc congue nisi vitae suscipit. Fringilla est
        ullamcorper eget nulla facilisi etiam dignissim diam. Pulvinar elementum
        integer enim neque volutpat ac tincidunt. Ornare suspendisse sed nisi
        lacus sed viverra tellus. Purus sit amet volutpat consequat mauris.
        Elementum eu facilisis sed odio morbi. Euismod lacinia at quis risus sed
        vulputate odio. Morbi tincidunt ornare massa eget egestas purus viverra
        accumsan in. In hendrerit gravida rutrum quisque non tellus orci ac.
        Pellentesque nec nam aliquam sem et tortor. Habitant morbi tristique
        senectus et. Adipiscing elit duis tristique sollicitudin nibh sit.
        Ornare aenean euismod elementum nisi quis eleifend. Commodo viverra
        maecenas accumsan lacus vel facilisis. Nulla posuere sollicitudin
        aliquam ultrices sagittis orci a.
      </Typography>

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
            keepAlive={true}
          >
            <Killer />
          </BlocProvider>
        </CardContent>
      </Card>

      <Typography variant="h3">Local Providers</Typography>
      <Card>
        <CardContent>
          <BlocProvider<CounterCubit>
            bloc={() => new CounterCubit("local_1")}
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
            bloc={() => new CounterCubit("local_2")}
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
