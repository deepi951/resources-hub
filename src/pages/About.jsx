function About() {
  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>About ResourceHub</h1>
        <p>
          ResourceHub is a campus marketplace designed for PSG Tech students to buy and sell
          affordable academic and student essentials within the campus community.
        </p>
        <p>
          Our vision is to build a trusted student-to-student marketplace where useful products get
          a second life and students can save money on textbooks, electronics, hostel essentials,
          lab tools, and more.
        </p>

        <div className="info-grid" style={{ marginTop: '24px' }}>
          <div className="info-panel">
            <h3>Verified students</h3>
            <p>Only PSG Tech users can buy and sell on the platform.</p>
          </div>
          <div className="info-panel">
            <h3>Affordable prices</h3>
            <p>Find quality used and new essentials at fair student prices.</p>
          </div>
          <div className="info-panel">
            <h3>Secure platform</h3>
            <p>Verified accounts, payment flow, and campus-focused trust.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About
