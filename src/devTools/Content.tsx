import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useBloc } from "./state/state";
import BlocsCubit from "./state/BlocsCubit";
import BlocBase from "../v0_lib/BlocBase";
import { Alert } from "@material-ui/lab";
import { ChangeEvent } from "../v0_lib/types";
import clsx from "clsx";
import Bug from "@material-ui/icons/BugReport";

const useStyles = makeStyles((theme) => ({
  root: {
    position: "fixed",
    background: "#333",
    zIndex: 9999,
    borderTop: "2px solid #000",
    display: "flex",
    flexDirection: "column",
    right: 0,
    bottom: 0,
    left: 0,
    height: "500px",
    transform: "translateY(100%)",
    transition: "transform 0.3s ease-in-out",
  },
  showRoot: {
    transform: "translateY(0)",
  },
  showButton: {
    position: "absolute",
    bottom: "100%",
    right: 0,
  },
  content: {
    flex: "1",
    display: "flex",
    height: "0",
  },
  blocItems: {
    overflow: "auto",
    width: "230px",
  },
  listHeader: {
    background: "#333",
    borderBottom: "1px solid #555",
  },
}));

const useItemStyles = makeStyles((theme) => ({
  item: {
    width: "100%",
    justifyContent: "flex-start",

    "& span": {
      textTransform: "none",
    },
  },
  itemWrap: {
    position: "relative",
  },
  "@keyframes move": {
    "0%": {
      left: "100%",
      opacity: 1,
    },
    "100%": {
      left: "0%",
      opacity: 0,
    },
  },
  event: {
    width: "4px",
    pointerEvents: "none",
    background: "#f99",
    position: "absolute",

    left: "100%",
    top: 0,
    bottom: 0,
    opacity: 0,
    animation: `$move 600ms linear`,
  },
}));

const useDetailStyles = makeStyles((theme) => ({
  details: {
    flex: "1",
    overflow: "auto",
    borderLeft: "1px solid #000",
    padding: "20px",
  },
  value: {
    padding: "15px 20px",
    marginBottom: "20px",
  },
  code: {
    margin: "10px 0",
    background: "#111",
    padding: "6px 20px",
    borderRadius: "5px",
    color: "white",
  },
}));

const BlocItem: FC<{
  bloc: BlocBase<any>;
  onSelect: (selected: BlocBase<any>, event?: ChangeEvent<any>) => void;
  selected: boolean;
}> = ({ bloc, onSelect, selected }) => {
  const classes = useItemStyles();
  const container = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<ChangeEvent<any> | undefined>(undefined);

  const addChange = useCallback(
    (e: ChangeEvent<any>) => {
      setEvent(e);
      const el = document.createElement("div");
      el.classList.add(classes.event);
      container.current?.appendChild(el);
      setTimeout(() => {
        container.current?.removeChild(el);
      }, 1000);
    },
    [bloc, container]
  );

  useEffect(() => {
    return bloc.addChangeListener(addChange);
  }, [bloc]);

  return (
    <div ref={container} className={classes.itemWrap}>
      <ListItem
        button
        className={classes.item}
        onClick={() => onSelect(bloc, event)}
        selected={selected}
      >
        <ListItemText>{bloc.constructor.name}</ListItemText>
      </ListItem>
    </div>
  );
};

const BlocDetails: FC<{
  bloc?: BlocBase<any>;
  lastEvent?: ChangeEvent<any>;
}> = ({ bloc, lastEvent }) => {
  const classes = useDetailStyles();
  const selected = bloc;
  const [event, setEvent] = useState<ChangeEvent<any> | undefined>(lastEvent);

  const addChange = useCallback(
    (event?: ChangeEvent<any>) => {
      setEvent(event);
    },
    [bloc]
  );

  useEffect(() => {
    return bloc?.addChangeListener(addChange);
  }, [bloc]);

  return (
    <div className={classes.details}>
      {selected && (
        <div>
          <Typography variant="h5">Value</Typography>
          <Paper className={classes.value}>
            <pre className={classes.code}>
              {JSON.stringify(selected.state, null, 2)}
            </pre>
          </Paper>

          <Typography variant="h5">Most recent change</Typography>
          <Paper className={classes.value}>
            {!event && <Alert severity="info">No events captured</Alert>}
            {event && (
              <Grid container spacing={3}>
                <Grid item sm={6}>
                  <Typography variant="body1">From</Typography>
                  <pre className={classes.code}>
                    {JSON.stringify(event?.currentState, null, 2)}
                  </pre>
                </Grid>
                <Grid item sm={6}>
                  <Typography variant="body1">To</Typography>
                  <pre className={classes.code}>
                    {JSON.stringify(event?.nextState, null, 2)}
                  </pre>
                </Grid>
              </Grid>
            )}
          </Paper>

          <Typography variant="h5">Details</Typography>
          <Paper className={classes.value}>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <strong>Created At</strong>
                    </TableCell>
                    <TableCell>{selected.createdAt.toISOString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>ID</strong>
                    </TableCell>
                    <TableCell>{selected.id}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Register Listeners</strong>
                    </TableCell>
                    <TableCell>{selected.registerListeners.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Change Listeners</strong> (2 are from the debug
                      tools)
                    </TableCell>
                    <TableCell>{selected.changeListeners.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Value Change Listeners</strong>
                    </TableCell>
                    <TableCell>
                      {selected.valueChangeListeners.length}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </div>
      )}
      {!selected && (
        <div>
          <Alert severity="info">Select a BLoC to see details</Alert>
        </div>
      )}
    </div>
  );
};

const Content: FC = () => {
  const classes = useStyles();
  // const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<
    [BlocBase<any> | undefined, ChangeEvent<any> | undefined]
  >([undefined, undefined]);
  const [blocs] = useBloc(BlocsCubit);
  const [show, setShow] = useState(false);

  // const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
  //   setTab(newValue);
  // };

  // const [change, setChange] = useState<Record<string, ChangeEvent<any>>>({});
  //
  // const addChange = useCallback((id: string, event: ChangeEvent<any>) => {
  //   setChange({
  //     ...change,
  //     [id]: event
  //   });
  //   console.log({...change});
  // }, [change])
  //
  // useEffect(() => {
  //   const removers: Array<() => void> = [];
  //   blocs.blocs.forEach(b => {
  //     const rm = b.addChangeListener((event) => {
  //       addChange(b.id, event);
  //     });
  //     removers.push(rm);
  //   });
  //
  //   return () => {
  //     removers.forEach(rm => rm());
  //   };
  // }, []);

  const globalBlocs = useMemo(
    () => blocs.blocs.filter((b) => b.meta.scope === "global"),
    [blocs]
  );
  const localBlocs = useMemo(
    () => blocs.blocs.filter((b) => b.meta.scope === "local"),
    [blocs]
  );

  return (
    <div
      className={clsx(classes.root, {
        [classes.showRoot]: show,
      })}
    >
      {/*<Paper square>*/}
      {/*  <Tabs*/}
      {/*    value={tab}*/}
      {/*    indicatorColor="primary"*/}
      {/*    textColor="primary"*/}
      {/*    onChange={handleChange}*/}
      {/*    aria-label="disabled tabs example"*/}
      {/*  >*/}
      {/*    <Tab label="Blocs" />*/}
      {/*  </Tabs>*/}
      {/*</Paper>*/}
      <IconButton onClick={() => setShow(!show)} className={classes.showButton}>
        <Bug />
      </IconButton>
      <div className={classes.content}>
        <div className={classes.blocItems}>
          <List>
            <ListSubheader className={classes.listHeader}>
              Global BLoCs ({globalBlocs.length})
            </ListSubheader>
            {globalBlocs.map((bloc) => (
              <BlocItem
                key={bloc.id}
                bloc={bloc}
                onSelect={(b, e) => setSelected([b, e])}
                selected={bloc === selected[0]}
              />
            ))}
            <ListSubheader className={classes.listHeader}>
              Local BLoCs ({localBlocs.length})
            </ListSubheader>
            {localBlocs.map((bloc) => (
              <BlocItem
                key={bloc.id}
                bloc={bloc}
                onSelect={(b, e) => setSelected([b, e])}
                selected={bloc === selected[0]}
              />
            ))}
          </List>
        </div>
        <BlocDetails
          key={selected[0]?.id}
          bloc={selected[0]}
          lastEvent={selected[1]}
        />
      </div>
    </div>
  );
};

export default Content;
