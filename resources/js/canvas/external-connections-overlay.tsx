import { useState } from 'react';

import { groupByCorner } from './external-connections';
import type { Corner, ExternalConnection } from './external-connections';

type ExternalConnectionsOverlayProps = {
    connections: readonly ExternalConnection[];
    onTravel: (targetId: string) => void;
};

// RF-09: discreet indications pinned to the corners of the screen, outside
// the physics; a click travels to the note they point to.
export function ExternalConnectionsOverlay({
    connections,
    onTravel,
}: ExternalConnectionsOverlayProps) {
    const [openCorner, setOpenCorner] = useState<Corner | null>(null);

    const travel = (targetId: string) => {
        setOpenCorner(null);
        onTravel(targetId);
    };

    return (
        <>
            {groupByCorner(connections).map((group) => (
                <nav
                    key={group.corner}
                    className="cvc-external"
                    data-corner={group.corner}
                    aria-label={`Conexões para fora deste espaço (${group.corner})`}
                >
                    {group.shown.map((connection) => (
                        <button
                            key={connection.relationId}
                            type="button"
                            className="cvc-external__link"
                            title={`Ir até ${connection.title}`}
                            onClick={() => travel(connection.targetId)}
                        >
                            {connection.title}
                        </button>
                    ))}
                    {group.hidden.length > 0 && (
                        <button
                            type="button"
                            className="cvc-external__more"
                            aria-expanded={openCorner === group.corner}
                            onClick={() =>
                                setOpenCorner((current) =>
                                    current === group.corner
                                        ? null
                                        : group.corner,
                                )
                            }
                        >
                            +{group.hidden.length}
                        </button>
                    )}
                    {openCorner === group.corner && (
                        <ul className="cvc-external__list">
                            {group.hidden.map((connection) => (
                                <li key={connection.relationId}>
                                    <button
                                        type="button"
                                        className="cvc-external__link"
                                        onClick={() =>
                                            travel(connection.targetId)
                                        }
                                    >
                                        {connection.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>
            ))}
        </>
    );
}
