import Typography from "@material-ui/core/Typography";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { BlocBuilder, BlocProvider } from "../state";
import CounterCubit from "../bloc/CounterCubit";
import { Box, Button, Card, CardContent } from "@material-ui/core";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import Auth from "../components/Auth";
import Buttons from "../components/Buttonts";

const useStyles = makeStyles((theme) => ({
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
}));

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

      <Typography variant="h3">Local Providers</Typography>
      <Card>
        <CardContent>
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

          {/*<BlocProvider<LocalCounterCubit>*/}
          {/*    create={() => new LocalCounterCubit()}*/}
          {/*>*/}
          {/*    <BlocBuilder<LocalCounterCubit>*/}
          {/*        bloc={LocalCounterCubit}*/}
          {/*        builder={([value, {increment}]) => <div>*/}
          {/*            <Button onClick={() => increment()}>{value}</Button>*/}
          {/*        </div>}*/}
          {/*    />*/}
          {/*</BlocProvider>*/}

          {/*<BlocProvider<LocalCounterCubit>*/}
          {/*    create={() => new LocalCounterCubit()}*/}
          {/*>*/}
          {/*    <BlocBuilder<LocalCounterCubit>*/}
          {/*        bloc={LocalCounterCubit}*/}
          {/*        builder={([value, {increment}]) => <div>*/}
          {/*            <Button onClick={() => increment()}>{value}</Button>*/}
          {/*        </div>}*/}
          {/*    />*/}
          {/*</BlocProvider>*/}
        </CardContent>
      </Card>
    </>
  );
}
