import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <h4>ResourceHub</h4>
          <p>ResourceHub — Campus Marketplace</p>
          <p>Your Campus. Your Marketplace.</p>
        </div>

        <div>
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/products">Products</Link>
          <Link to="/login">Login</Link>
        </div>

        <div>
          <h4>Support</h4>
          <Link to="/contact">Contact</Link>
          <Link to="/support">Support</Link>
          <Link to="/about">Company</Link>
        </div>

        <div>
          <h4>Safety</h4>
          <Link to="/safety">Student Safety Guidelines</Link>
          <Link to="/safety">Community Guidelines</Link>
          <Link to="/report">Report a Product</Link>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 ResourceHub. All Rights Reserved.
      </div>
    </footer>
  )
}

export default Footer
