import { LayoutBloc } from '@blac/devtools-ui';
import { ChannelBloc } from './messenger/blocs/ChannelBloc';
import { CounterBloc } from './examples/01-counter/CounterBloc';

// will listen forever, run initially then run every time any state changes that is accessed, as long as all Blocs are still mounted, or until `removeListener` is called
// will throw an error if any of the blocs are unmounted, unless `removeListener` is called first
const removeListener = await listen(() => {
  // adds the LayoutBloc.state.currentLayout and ChannelBloc.state.currentChannel as dependencies, will run initially and then again when either changes
  const layout = LayoutBloc.connect().state.currentLayout;
  const channel = ChannelBloc.connect().state.currentChannel;

  if (layout || channel) {
    console.log({ layout, channel });
  }
});

// void once((resolve) => {
//   const cmsBloc = CmsBloc.connect();
//   const dataSourceBloc = DataSourceBloc.connect();
//
//   const tasksWiDeets = cmsBloc.state.tasksWithDetails;
//   const tasksLoaded = dataSourceBloc.state.dataloaded.tasks;
//
//   if (tasksLoaded) {
//     cmsBloc.setTasks(dataSourceBloc.getTasks());
//     resolve(tasksWiDeets)
//   }
// }).then((tasksWiDeets) => {
//   // now we can be sure that cms data and tasks are loaded
//   // update the state from the UserTasksBloc with the tasks with details
//   this.emit({tasks: tasksWiDeets});
// })
// DataSourceBloc.get().loadTasks();

// will run initially and then every time any of the specified blocs' states change, untill until any of the blocs are unmounted, or until `resolve` is called
// will throw an error if any of the blocs are unmounted before `resolve` is called
const result = await once((resolve) => {
  const layout = LayoutBloc.connect().state.currentLayout;
  const channel = ChannelBloc.connect().state.currentChannel;

  if (layout || channel) {
    // once resolve is called, the listener is removed and will not run again, the `once` promise resolves with the value passed to `resolve`
    resolve({ layout, channel });
  }
});

// same as the above, but with options
const result2 = await once(
  (resolve) => {
    const layout = LayoutBloc.connect().state.currentLayout;
    const channel = ChannelBloc.connect('special').state.currentChannel;

    if (layout || channel) {
      return resolve({ layout, channel });
    }
  },
  {
    // will only wait until timeout is reached, will throw an error if timeout is reached before `resolve` is called
    timeout: 5000,
    // will only re-try if all of these blocs are still mounted
    bind: [
      // add additional bloc that is bound to this listener, if this bloc is unmounted, or any used in the `once` body, the listener is removed
      // will not re-run if only this bloc's state changes, unless it is also used in the `once` body
      CounterBloc.withInstance('special'),
    ],
  },
);

// less magic
const f = async () => {
  const reqA = waitFor(LayoutBloc, (bloc) => bloc.state.currentLayout !== null);
  const reqB = waitFor(
    ChannelBloc,
    (bloc) => bloc.state.currentChannel !== null,
  );

  const [layoutResult, channelResult] = await Promise.all([reqA, reqB]);

  const layout2 = layoutResult.state.currentLayout;
  const channel2 = channelResult.state.currentChannel;

  console.log({ layout2, channel2 });
};

// listen
const removeListener2 = await watch(() => {
  const layout = LayoutBloc.connect().state.currentLayout;
  const channel = ChannelBloc.connect().state.currentChannel;

  if (layout || channel) {
    return 'done';
  }
});

const removeListener2 = await watch(
  (lb, cb) => {
    const layout = lb.state.currentLayout;
    const channel = cb.state.currentChannel;

    if (layout || channel) {
      return 'done';
    }
  },
  [LayoutBloc, ChannelBloc],
);

watch(() => {
  const layout = LayoutBloc.connect().state.currentLayout;
  const channel = ChannelBloc.connect().state.currentChannel;

  if (layout || channel) {
    return 'done';
  }
}).then(() => {
  // will run when the watch returns a non-undefined value
});
