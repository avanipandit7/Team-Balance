import React from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = 'rgba(255,255,255,0.12)',
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn('absolute', className)}
      style={{ pointerEvents: 'none' }}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{ width, height, position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            background: `linear-gradient(90deg, ${gradient}, rgba(255,255,255,0.03), transparent)`,
            backdropFilter: 'blur(2px)',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 8px 32px rgba(255,255,255,0.08)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = 'Design Collective',
  title1 = 'Elevate Your Digital Vision',
  title2 = 'Crafting Exceptional Websites',
  description = 'A cinematic landing experience for your project, with motion, depth, and a stronger first impression.',
  children,
  className,
}) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(59,130,246,0.16), transparent 28%), radial-gradient(circle at bottom right, rgba(244,114,182,0.12), transparent 24%), linear-gradient(135deg, #020617 0%, #030712 45%, #0b1120 100%)',
        color: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.08), transparent 40%, rgba(244,114,182,0.06))',
          filter: 'blur(48px)',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient='rgba(99,102,241,0.24)'
          className='left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]'
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient='rgba(244,114,182,0.24)'
          className='right-[-5%] md:right-[0%] top-[70%] md:top-[75%]'
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient='rgba(168,85,247,0.24)'
          className='left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]'
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient='rgba(251,191,36,0.22)'
          className='right-[15%] md:right-[20%] top-[10%] md:top-[15%]'
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient='rgba(34,211,238,0.22)'
          className='left-[20%] md:left-[25%] top-[5%] md:top-[10%]'
        />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          padding: '32px 16px 48px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1100 }}>
          <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
            <motion.div
              custom={0}
              variants={fadeUpVariants}
              initial='hidden'
              animate='visible'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                marginBottom: 28,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Circle className='h-2 w-2 fill-rose-500/80' />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 }}>{badge}</span>
            </motion.div>

            <motion.div custom={1} variants={fadeUpVariants} initial='hidden' animate='visible'>
              <h1
                style={{
                  margin: '0 0 18px',
                  fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
                  lineHeight: 0.95,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.72))',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {title1}
                </span>
                <span
                  style={{
                    display: 'block',
                    background: 'linear-gradient(90deg, #a5b4fc, rgba(255,255,255,0.96), #f9a8d4)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {title2}
                </span>
              </h1>
            </motion.div>

            <motion.div custom={2} variants={fadeUpVariants} initial='hidden' animate='visible'>
              <p
                style={{
                  maxWidth: 740,
                  margin: '0 auto',
                  color: 'rgba(255,255,255,0.62)',
                  fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
                  lineHeight: 1.7,
                  fontWeight: 300,
                  letterSpacing: 0.2,
                }}
              >
                {description}
              </p>
            </motion.div>
          </div>

          {children ? (
            <motion.div
              custom={3}
              variants={fadeUpVariants}
              initial='hidden'
              animate='visible'
              style={{
                margin: '34px auto 0',
                maxWidth: 560,
                padding: 24,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(18px)',
              }}
            >
              {children}
            </motion.div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(2,6,23,0.92), transparent 28%, rgba(2,6,23,0.82))',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export { HeroGeometric };