import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setViewportMock = vi.fn();
const fitViewMock = vi.fn().mockResolvedValue(true);
const getViewportMock = vi.fn(() => ({ x: -40, y: 25, zoom: 1.4 }));

vi.mock("@inertiajs/react", () => ({
  Head: () => null,
}));

vi.mock("@xyflow/react", () => ({
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  Controls: () => null,
  Handle: () => null,
  Position: { Left: "left", Right: "right" },
  ReactFlow: ({
    children,
    nodes,
    onMove,
    onInit,
    onNodeDoubleClick,
  }: {
    children: ReactNode;
    nodes: Array<{
      id: string;
      data: { label: string; kind: string };
      hidden?: boolean;
    }>;
    onMove: (
      event: null,
      viewport: { x: number; y: number; zoom: number },
    ) => void;
    onInit?: (instance: {
      setViewport: typeof setViewportMock;
      fitView: typeof fitViewMock;
      getViewport: typeof getViewportMock;
    }) => void;
    onNodeDoubleClick?: (
      event: MouseEvent,
      node: {
        id: string;
        data: { label: string; kind: string };
      },
    ) => void;
  }) => {
    useEffect(() => {
      onInit?.({
        setViewport: setViewportMock,
        fitView: fitViewMock,
        getViewport: getViewportMock,
      });
    }, [onInit]);

    return (
      <div>
        {nodes
          .filter((node) => !node.hidden)
          .map((node) => (
            <span
              key={node.id}
              onDoubleClick={(event) =>
                onNodeDoubleClick?.(event.nativeEvent, node)
              }
            >
              {node.data.label}
            </span>
          ))}
        <button
          type="button"
          onClick={() => onMove(null, { x: 0, y: 0, zoom: 1 })}
        >
          aproximar
        </button>
        {children}
      </div>
    );
  },
}));

import VaultPage from "../pages/vault";

describe("RF-02 vault canvas", () => {
  beforeEach(() => {
    setViewportMock.mockReset();
    fitViewMock.mockClear();
    getViewportMock.mockClear();
  });

  it("reveals context detail through zoom without entering edit mode", () => {
    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Primeiro Contexto",
                  documents: [],
                },
              ],
            },
          ],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: { x: 120, y: 120, zoom: 0.65 },
          focusEntityId: null,
        }}
      />,
    );

    const canvas = screen.getByRole("main", { name: "Canvas do vault" });

    expect(within(canvas).getByText("Meu Universo")).toBeInTheDocument();
    expect(
      within(canvas).queryByText("Primeiro Contexto"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "aproximar" }));

    expect(within(canvas).getByText("Primeiro Contexto")).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Conteúdo Markdown" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the draft visible and reports failure when saving is rejected", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          document: {
            id: "document-1",
            title: null,
            content: "",
            revision: 1,
            entityType: null,
            properties: {},
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Falha de armazenamento." }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Primeiro Contexto",
                  documents: [],
                },
              ],
            },
          ],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: { x: 120, y: 120, zoom: 0.65 },
          focusEntityId: null,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nova nota" }));
    const editor = await screen.findByRole("textbox", {
      name: "Conteúdo Markdown",
    });
    fireEvent.change(editor, { target: { value: "# rascunho pendente" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Falha de armazenamento.",
      ),
    );
    expect(editor).toHaveValue("# rascunho pendente");
    expect(
      screen.getByRole("button", { name: "Voltar ao canvas" }),
    ).toBeDisabled();

    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.unstubAllGlobals();
  });

  it("returns to the persisted viewport without undoing the document", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          document: {
            id: "document-1",
            title: null,
            content: "# conteúdo confirmado",
            revision: 4,
            entityType: null,
            properties: {},
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const persistedViewport = { x: -180.75, y: 41.5, zoom: 1.6 };

    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Primeiro Contexto",
                  documents: [
                    {
                      id: "document-1",
                      title: null,
                      revision: 4,
                      entityType: null,
                      properties: {},
                    },
                  ],
                },
              ],
            },
          ],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: persistedViewport,
          focusEntityId: "document-1",
        }}
      />,
    );

    fireEvent.doubleClick(
      within(screen.getByRole("main", { name: "Canvas do vault" })).getByText(
        "Sem título",
      ),
    );
    expect(
      await screen.findByDisplayValue("# conteúdo confirmado"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao canvas" }));

    expect(setViewportMock).toHaveBeenCalledWith(persistedViewport);

    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.unstubAllGlobals();
  });

  it("locates one stable entity through each context in the explorer", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Projetos",
                  documents: [
                    {
                      id: "entity-shared",
                      title: "Conhecimento compartilhado",
                      revision: 1,
                      entityType: null,
                      properties: {},
                    },
                  ],
                },
                {
                  id: "context-2",
                  name: "Estudos",
                  documents: [
                    {
                      id: "entity-shared",
                      title: "Conhecimento compartilhado",
                      revision: 1,
                      entityType: null,
                      properties: {},
                    },
                  ],
                },
              ],
            },
          ],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: { x: 0, y: 0, zoom: 0.65 },
          focusEntityId: null,
        }}
      />,
    );

    const explorer = screen.getByRole("complementary", {
      name: "Explorador do vault",
    });
    const sharedEntityLocations = within(explorer).getAllByRole("button", {
      name: "DocumentoConhecimento compartilhado",
    });

    expect(sharedEntityLocations).toHaveLength(2);
    fireEvent.click(sharedEntityLocations[1]);

    await waitFor(() =>
      expect(fitViewMock).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [{ id: "entity:context-2:entity-shared" }],
        }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/vault/workspace",
      expect.objectContaining({ method: "PATCH" }),
    );

    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.unstubAllGlobals();
  });

  it("updates type and properties without replacing the focused entity", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entity: {
          id: "entity-1",
          title: "Registro",
          revision: 3,
          entityType: "referência",
          properties: { status: "ativo" },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Projetos",
                  documents: [
                    {
                      id: "entity-1",
                      title: "Registro",
                      revision: 3,
                      entityType: null,
                      properties: {},
                    },
                  ],
                },
              ],
            },
          ],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: { x: 0, y: 0, zoom: 1.4 },
          focusEntityId: "entity-1",
        }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Tipo" }), {
      target: { value: "referência" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Adicionar propriedade" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Nome 1" }), {
      target: { value: "status" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Valor 1" }), {
      target: { value: "ativo" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar propriedades" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/vault/entities/entity-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            type: "referência",
            properties: { status: "ativo" },
          }),
        }),
      ),
    );
    expect(screen.getByRole("textbox", { name: "Tipo" })).toHaveValue(
      "referência",
    );

    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.unstubAllGlobals();
  });

  it("reuses a focused entity and creates a global relation", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          relation: {
            id: "relation-1",
            sourceEntityId: "entity-1",
            targetEntityId: "entity-2",
            contextId: null,
            relationType: null,
            isDirected: false,
            properties: {},
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const summary = (id: string, title: string) => ({
      id,
      title,
      revision: 1,
      entityType: null,
      properties: {},
    });

    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Projetos",
                  documents: [
                    summary("entity-1", "Origem"),
                    summary("entity-2", "Destino"),
                  ],
                },
                {
                  id: "context-2",
                  name: "Estudos",
                  documents: [],
                },
              ],
            },
          ],
          relations: [],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          contexts: "/vault/contexts",
          relations: "/vault/relations",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: { x: 0, y: 0, zoom: 1.4 },
          focusEntityId: "entity-1",
        }}
      />,
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Reutilizar em contexto" }),
      { target: { value: "context-2" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Adicionar ao contexto" }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/vault/contexts/context-2/entities",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Relacionar com" }), {
      target: { value: "entity-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar relação" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/vault/relations",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            source_entity_id: "entity-1",
            target_entity_id: "entity-2",
            context_id: null,
            type: null,
            directed: false,
            properties: {},
          }),
        }),
      ),
    );

    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.unstubAllGlobals();
  });

  it("creates a derived perspective from the active configuration", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        perspective: {
          id: "perspective-derived",
          name: "Apresentação",
          sourcePerspectiveId: "perspective-source",
          filters: {
            contextIds: ["context-1"],
            entityTypes: ["referência"],
          },
          layouts: [],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VaultPage
        vault={{
          id: "vault-1",
          name: "CVC",
          universes: [
            {
              id: "universe-1",
              name: "Meu Universo",
              contexts: [
                {
                  id: "context-1",
                  name: "Projetos",
                  documents: [],
                },
              ],
            },
          ],
          perspectives: [
            {
              id: "perspective-source",
              name: "Arquitetura",
              sourcePerspectiveId: null,
              filters: {
                contextIds: ["context-1"],
                entityTypes: ["referência"],
              },
              layouts: [],
            },
          ],
        }}
        endpoints={{
          documents: "/vault/documents",
          entities: "/vault/entities",
          perspectives: "/vault/perspectives",
          workspace: "/vault/workspace",
        }}
        workspace={{
          viewport: { x: 0, y: 0, zoom: 1.4 },
          focusEntityId: null,
          perspectiveId: "perspective-source",
        }}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Nome da nova perspectiva",
      }),
      { target: { value: "Apresentação" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Derivar atual" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/vault/perspectives",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Apresentação",
            source_perspective_id: "perspective-source",
            filters: {
              context_ids: ["context-1"],
              entity_types: ["referência"],
            },
          }),
        }),
      ),
    );

    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.unstubAllGlobals();
  });
});
