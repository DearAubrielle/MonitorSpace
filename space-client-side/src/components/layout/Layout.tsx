import './Layout.css';
import { useEffect, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
const Layout = () => {
    const footerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (footerRef.current) {
                if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
                    footerRef.current.style.display = 'block';
                } else {
                    footerRef.current.style.display = 'none';
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
    
    return (
        <div id='layout'>
            <Header />
            <div className='mainWrapper'>
                <Sidebar />
                <main>
                <div>
                <h1>My App</h1>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>

                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    consectetur, nunc vel luctus vestibulum, erat nulla laoreet ex, nec
                    tincidunt mi nunc nec nisi. Nullam sit amet sapien sit amet purus
                    molestie ultricies. Nullam nec risus at ex tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia. Nulla
                    facilisi. Sed nec odio sit amet purus tincidunt lacinia.
                </p>
                </div>
                </main>

            </div>
            
        </div>
    );
};

export default Layout;