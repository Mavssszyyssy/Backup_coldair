import {
  FacebookLogo,
  InstagramLogo,
  TwitterLogo,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>AeroPulse</h4>
          <p>
            Professional AC installation, maintenance, and repair services for
            residential and commercial customers.
          </p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <div className="footer-link-list">
            <Link className="footer-link" to="/home">
              Home
            </Link>
            <Link className="footer-link" to="/services">
              Get the App
            </Link>
            <Link className="footer-link" to="/shop">
              Shop
            </Link>
            <Link className="footer-link" to="/contact">
              Contact
            </Link>
            <Link className="footer-link" to="/faq">
              FAQs
            </Link>
          </div>
        </div>
        <div className="footer-section">
          <h4>Follow Us</h4>
          <div className="social-links">
            <button
              type="button"
              onClick={() => alert("Facebook")}
              aria-label="Facebook"
            >
              <FacebookLogo size={24} weight="bold" className="inline-icon" />
            </button>
            <button
              type="button"
              onClick={() => alert("Instagram")}
              aria-label="Instagram"
            >
              <InstagramLogo size={24} weight="bold" className="inline-icon" />
            </button>
            <button
              type="button"
              onClick={() => alert("Twitter")}
              aria-label="Twitter"
            >
              <TwitterLogo size={24} weight="bold" className="inline-icon" />
            </button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 AeroPulse. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
