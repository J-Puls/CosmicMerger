import React, { useEffect } from 'react';


const CursorEffects = () => {
    useEffect(() => {
        let mouseX = 0;
        let mouseY = 0;

        const createTrail = (x, y) => {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            trail.style.left = (x - 2) + 'px';
            trail.style.top = (y - 2) + 'px';
            document.body.appendChild(trail);

            // Remove trail after animation
            setTimeout(() => {
                if (trail.parentNode) {
                    trail.parentNode.removeChild(trail);
                }
            }, 800);
        };

        const createStarExplosion = (x, y) => {
            const starCount = 12;
            const colors = ['#ffffff', '#b3d9ff', '#ffd9b3', '#ffb3d9', '#d9b3ff', '#00d4ff'];

            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'explosion-star';

                // Random color from our palette
                star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

                // Random size variation
                const size = Math.random() * 2 + 2; // 2-4px
                star.style.width = size + 'px';
                star.style.height = size + 'px';

                // Calculate random direction for each star
                const angle = (360 / starCount) * i + (Math.random() - 0.5) * 30;
                const distance = Math.random() * 80 + 40; // Random distance 40-120px
                const radian = angle * (Math.PI / 180);

                const endX = x + Math.cos(radian) * distance;
                const endY = y + Math.sin(radian) * distance;

                // Set initial position at click point
                star.style.left = x + 'px';
                star.style.top = y + 'px';

                // Add to page
                document.body.appendChild(star);

                // Animate to end position
                star.style.transition = 'all 1.2s ease-out';

                // Small delay to ensure initial position is set
                setTimeout(() => {
                    star.style.left = endX + 'px';
                    star.style.top = endY + 'px';
                }, 10);

                // Remove star after animation
                setTimeout(() => {
                    if (star.parentNode) {
                        star.parentNode.removeChild(star);
                    }
                }, 1200);
            }
        };

        const handleMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Create trail effect
            if (Math.random() > 0.7) { // Reduce frequency for subtlety
                createTrail(mouseX, mouseY);
            }
        };

        const handleClick = (e) => {
            createStarExplosion(e.clientX, e.clientY);
        };

        // Add event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick);

        // Cleanup function
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick);
        };
    }, []);

    return null; // This component doesn't render anything visible
};

export default CursorEffects;