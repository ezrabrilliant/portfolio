import { bare, getBio, getContact, getShipLog } from '@/config/os-content';
import { CYCLE_SHORTCUT_LABEL } from '@/os/app-registry';
import './about.css';

export default function AboutApp() {
  const bio = getBio();
  const contact = getContact();
  return (
    <article className="case about">
      <h3>{bio.name}</h3>
      <p className="meta">{bio.location}</p>
      <p>{bio.paragraph}</p>
      <h4>ship log</h4>
      <ul className="shiplog">
        {getShipLog().map((e) => (
          <li key={e.date}><span>{e.date}</span> {e.text}</li>
        ))}
      </ul>
      <ul className="contact">
        <li><span>email</span><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
        <li><span>github</span><a href={contact.github} target="_blank" rel="noopener noreferrer">{bare(contact.github)}</a></li>
        <li><span>linkedin</span><a href={contact.linkedin} target="_blank" rel="noopener noreferrer">{bare(contact.linkedin)}</a></li>
      </ul>
      <p className="keys">keys: Esc closes a window, {CYCLE_SHORTCUT_LABEL} cycles windows</p>
    </article>
  );
}
