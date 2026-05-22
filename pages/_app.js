import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../styles/global.css';

import { Roboto } from 'next/font/google';
import Head from 'next/head'; // Import Head

// We'll define two instances of Roboto for better control over weights
// '400' for body text, '700' for headings or strong elements
const robotoRegular = Roboto({
  subsets: ['latin'],
  weight: ['400'], // Only include regular weight
  variable: '--font-roboto-regular', // Define as CSS variable
  display: 'swap', // Optimize font loading
});

const robotoBold = Roboto({
  subsets: ['latin'],
  weight: ['700'], // Only include bold weight
  variable: '--font-roboto-bold', // Define as CSS variable
  display: 'swap', // Optimize font loading
});

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Omrvasm DMS</title> {/* Customize your project title */}
        <meta name="description" content="A professional-grade web application." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" /> {/* Add your favicon */}
      </Head>
      {/* Apply both font variables to the html element for global access */}
      <main className={`${robotoRegular.variable} ${robotoBold.variable}`}>
        <Component {...pageProps} />
      </main>
    </>
  );
}