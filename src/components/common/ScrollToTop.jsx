import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();
    const prevPathnameRef = useRef(pathname);

    useEffect(() => {
        if (prevPathnameRef.current !== pathname) {
            window.scrollTo(0, 0);
            prevPathnameRef.current = pathname;
        }
    }, [pathname]);

    return null;
};

export default ScrollToTop;
