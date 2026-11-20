import { describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ContributorCard from '../../components/Contributor/ContributorCard';
import { toContributor } from '../../helpers/contributors';

const ana = toContributor(
  {
    username: 'Ana Gómez',
    profileImage: 'https://github.com/ana.png',
    socialNetwork: 'instagram',
    socialLink: '@ana_g',
  },
  '2212345-3743',
);

describe('ContributorCard', () => {
  test('shows name, student code and favorite social network', () => {
    render(<ContributorCard contributor={ana} label="Question by" />);

    expect(screen.getByText('Question by')).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText('2212345-3743')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /instagram: @ana_g/i });
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/ana_g');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('falls back to initials when the image fails to load', () => {
    const { container } = render(<ContributorCard contributor={ana} />);
    fireEvent.error(container.querySelector('img'));
    expect(screen.getByText('AG')).toBeInTheDocument();
  });

  test('shows the handle without a link when the network has no profile URL', () => {
    const c = toContributor({ username: 'Beto', socialNetwork: 'discord', socialLink: '@beto' }, '1111111-1111');
    render(<ContributorCard contributor={c} />);
    expect(screen.getByText(/@beto/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  test('renders nothing without a contributor', () => {
    const { container } = render(<ContributorCard contributor={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
