import { forwardRef } from 'react';
import './Footer.module.css';
const Footer = forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <footer ref={ref}>My App Footer</footer>
    );
});

export default Footer;