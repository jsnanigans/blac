import PropTypes from "prop-types";
declare function ResponsiveDrawer(): JSX.Element;
declare namespace ResponsiveDrawer {
    var propTypes: {
        /**
         * Injected by the documentation to work in an iframe.
         * You won't need it on your project.
         */
        window: PropTypes.Requireable<(...args: any[]) => any>;
    };
}
export default ResponsiveDrawer;
