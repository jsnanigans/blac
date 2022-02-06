import Typography from "@material-ui/core/Typography";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { BlocBuilder, BlocProvider } from "../state";
import CounterCubit from "../bloc/CounterCubit";
import { Box, Button, Card, CardContent } from "@material-ui/core";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import Auth from "../components/Auth";
import Buttons from "../components/Buttonts";
var useStyles = makeStyles(function (theme) { return ({
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar,
}); });
export default function Sandbox() {
    var classes = useStyles();
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: classes.toolbar }),
        React.createElement(Typography, { paragraph: true }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Rhoncus dolor purus non enim praesent elementum facilisis leo vel. Risus at ultrices mi tempus imperdiet. Semper risus in hendrerit gravida rutrum quisque non tellus. Convallis convallis tellus id interdum velit laoreet id donec ultrices. Odio morbi quis commodo odio aenean sed adipiscing. Amet nisl suscipit adipiscing bibendum est ultricies integer quis. Cursus euismod quis viverra nibh cras. Metus vulputate eu scelerisque felis imperdiet proin fermentum leo. Mauris commodo quis imperdiet massa tincidunt. Cras tincidunt lobortis feugiat vivamus at augue. At augue eget arcu dictum varius duis at consectetur lorem. Velit sed ullamcorper morbi tincidunt. Lorem donec massa sapien faucibus et molestie ac."),
        React.createElement(Typography, { paragraph: true }, "Consequat mauris nunc congue nisi vitae suscipit. Fringilla est ullamcorper eget nulla facilisi etiam dignissim diam. Pulvinar elementum integer enim neque volutpat ac tincidunt. Ornare suspendisse sed nisi lacus sed viverra tellus. Purus sit amet volutpat consequat mauris. Elementum eu facilisis sed odio morbi. Euismod lacinia at quis risus sed vulputate odio. Morbi tincidunt ornare massa eget egestas purus viverra accumsan in. In hendrerit gravida rutrum quisque non tellus orci ac. Pellentesque nec nam aliquam sem et tortor. Habitant morbi tristique senectus et. Adipiscing elit duis tristique sollicitudin nibh sit. Ornare aenean euismod elementum nisi quis eleifend. Commodo viverra maecenas accumsan lacus vel facilisis. Nulla posuere sollicitudin aliquam ultrices sagittis orci a."),
        React.createElement(Typography, { variant: "h3" }, "Bloc"),
        React.createElement(Auth, null),
        React.createElement(Box, { m: 2 }),
        React.createElement(Typography, { variant: "h3" }, "BlocBuilder"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                        var value = _a[0], increment = _a[1].increment;
                        return (React.createElement("div", null,
                            React.createElement(Button, { onClick: function () { return increment(); } }, value)));
                    } }),
                React.createElement(Buttons, null),
                React.createElement(Box, { m: 2 }),
                React.createElement(BlocBuilder, { blocClass: AuthBloc, builder: function (_a) {
                        var value = _a[0], add = _a[1].add;
                        return (React.createElement("div", null,
                            React.createElement(Button, { onClick: function () { return add(AuthEvent.authenticated); } },
                                "Auth Bloc State: ",
                                React.createElement("b", null, value.toString()))));
                    } }))),
        React.createElement(Box, { m: 2 }),
        React.createElement(Typography, { variant: "h3" }, "Local Providers"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(BlocProvider, { bloc: function () { return new CounterCubit(); } },
                    React.createElement(Typography, { variant: "h4" }, "Local Provider #1"),
                    React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                            var value = _a[0], increment = _a[1].increment;
                            return (React.createElement("div", null,
                                React.createElement(Button, { onClick: function () { return increment(); } }, value),
                                React.createElement(Buttons, null)));
                        } })),
                React.createElement(BlocProvider, { bloc: function () { return new CounterCubit(); } },
                    React.createElement(Typography, { variant: "h4" }, "Local Provider #2"),
                    React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                            var value = _a[0], increment = _a[1].increment;
                            return (React.createElement("div", null,
                                React.createElement(Button, { onClick: function () { return increment(); } }, value),
                                React.createElement(Buttons, null)));
                        } }))))));
}
