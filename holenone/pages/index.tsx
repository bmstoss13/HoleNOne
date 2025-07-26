import React from "react";
import Link from "next/link";

import styles from './styling/index.module.css';

export default function Home() {
    return (
        <div className={styles['home-page-container']}>
        <div className={styles['home-page-header']}>
            <h1>Hole 'N One</h1>
            <p>Book your tee in no time.</p>
            <Link href="/courses">
                <button className={styles['home-page-button']}>
                    Browse Nearby Courses
                </button>
            </Link>
        </div>
        </div>
    );
}
