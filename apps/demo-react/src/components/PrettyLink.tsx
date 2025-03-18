import { Link } from '@tanstack/react-router';
import { FC } from 'react';

type LinkProps = React.ComponentProps<typeof Link>;

const PrettyLink: FC<LinkProps> = (props) => {
  return (
    <Link
      {...props}
      className="px-3 py-2 relative transition-all text-foreground dark:text-gray-100 font-medium hover:text-accent after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left [&.active]:text-accent [&.active]:after:scale-x-100"
    >
      {props.children}
    </Link>
  );
};

export default PrettyLink;
