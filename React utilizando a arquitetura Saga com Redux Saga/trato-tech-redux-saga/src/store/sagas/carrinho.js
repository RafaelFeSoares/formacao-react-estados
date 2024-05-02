import {
  carregarPagamento,
  finalizarPagamento,
  mudarCarrinho,
  mudarQuantidade,
  mudarTotal,
  resetarCarrinho,
} from "store/reducers/carrinho";
import { takeLatest, call, put, takeEvery, select } from "redux-saga/effects";
import usuariosService from "services/usuarios";
import cartoesService from "services/cartoes";
import bandeirasService from "services/bandeiras";
import { adicionarUsuario } from "store/reducers/usuario";
import { delay } from "framer-motion";
import { createStandaloneToast } from "@chakra-ui/toast";

const { toast } = createStandaloneToast();

const usuarioLogado = 2;

function* carregarPagamentoSaga() {
  try {
    const usuario = yield call(usuariosService.buscarPorId, usuarioLogado);
    const cartoes = yield call(cartoesService.buscarPorIdUsuario, usuarioLogado);
    const bandeiraIds = cartoes.map((cartao) => cartao.bandeiraId);
    const bandeiras = yield call(bandeirasService.buscarPorId, bandeiraIds);
    const cartoesComBandeiras = cartoes.map((cartao) => {
      const bandeiraDoCartao = bandeiras.find((bandeira) => bandeira.id === cartao.bandeiraId);
      return { ...cartao, taxa: bandeiraDoCartao.taxa, bandeira: bandeiraDoCartao.nome };
    });
    yield put(adicionarUsuario({ ...usuario, cartoes: cartoesComBandeiras }));
  } catch (e) {}
}

function* calcularTotal() {
  yield delay(500);
  const state = yield select();
  const total = state.carrinho.data.reduce((total, itemNoCarrinho) => {
    const item = state.itens.find((item) => item.id === itemNoCarrinho.id);
    return total + item.preco * itemNoCarrinho.quantidade;
  }, 0);
  yield put(mudarTotal(total));
}

function* finalizarPagamentoSaga({ payload }) {
  const { valorTotal, formaDePagamento } = payload;

  if (valorTotal > formaDePagamento.saldo) {
    return yield toast({
      title: "Erro",
      description: "Saldo insuficiente",
      status: "error",
      duration: 2000,
      isClosable: true,
    })
  } else {
    toast({
      title: "Sucesso!",
      description: "Compra realizada com sucesso!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
    yield put(resetarCarrinho())
  }
}

export function* carrinhoSaga() {
  yield takeLatest(carregarPagamento, carregarPagamentoSaga);
  yield takeEvery([mudarQuantidade, mudarCarrinho], calcularTotal);
  yield takeLatest(finalizarPagamento, finalizarPagamentoSaga);
}
