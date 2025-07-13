import React, { useEffect } from 'react';
import './StarField.css';

const StarField = () => {
    useEffect(() => {
        const starsContainer = document.getElementById('stars');
        if (!starsContainer) return;

        // Clear any existing stars
        starsContainer.innerHTML = '';

        const starCount = 150;
        const colors = ['#ffffff', '#b3d9ff', '#ffd9b3', '#ffb3d9', '#d9b3ff'];

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (Math.random() * 2 + 2) + 's';

            // Random star sizes and colors
            const size = Math.random() * 3 + 1;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            starsContainer.appendChild(star);
        }

        // Cleanup function
        return () => {
            if (starsContainer) {
                starsContainer.innerHTML = '';
            }
        };
    }, []);

    return <div className="stars" id="stars"></div>;
};

export default StarField;