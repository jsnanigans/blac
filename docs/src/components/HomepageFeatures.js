import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Simple and Lightweight',
    Svg: require('../../static/img/undraw_children_re_c37f.svg').default,
    description: (
      <>
        The BLoC pattern is easy to use and understand.
      </>
    ),
  },
  {
    title: 'Easy to mock and test',
    Svg: require('../../static/img/undraw_completed_re_cisp.svg').default,
    description: (
      <>
        Plays nicely with unit tests and other tools.
      </>
    ),
  },
  {
    title: 'Focused on Reusability',
    Svg: require('../../static/img/undraw_dev_focus_re_6iwt.svg').default,
    description: (
      <>
        Reuse you business logic in your components.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
